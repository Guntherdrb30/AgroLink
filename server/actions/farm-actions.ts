"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { farmSchema } from "@/lib/validators/farm";
import {
  createFarmForTenant,
  deleteTenantFarm,
  updateTenantFarm,
} from "@/server/services/farm-service";

const allowedRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

export async function createFarmAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...allowedRoles],
  });

  if (!tenantContext) {
    redirect("/farms?error=tenant");
  }

  const parsed = farmSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    hectares: formData.get("hectares"),
  });

  if (!parsed.success) {
    redirect("/farms?error=validation");
  }

  const farm = await createFarmForTenant(tenantContext.tenant.id, user.id, parsed.data, {
    primaryImage: formData.get("primaryImage") as File | null,
    logo: formData.get("logo") as File | null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/farms");
  redirect(`/farms/${farm.id}?success=created`);
}

export async function updateFarmAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...allowedRoles],
  });

  if (!tenantContext) {
    redirect("/farms?error=tenant");
  }

  const farmId = formData.get("farmId");

  if (typeof farmId !== "string" || !farmId) {
    redirect("/farms?error=missing_farm");
  }

  const parsed = farmSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    hectares: formData.get("hectares"),
  });

  if (!parsed.success) {
    redirect(`/farms/${farmId}?error=validation`);
  }

  await updateTenantFarm(tenantContext.tenant.id, farmId, parsed.data, {
    primaryImage: formData.get("primaryImage") as File | null,
    logo: formData.get("logo") as File | null,
  }, user.id);

  revalidatePath("/dashboard");
  revalidatePath("/farms");
  revalidatePath(`/farms/${farmId}`);
  redirect(`/farms/${farmId}?success=updated`);
}

export async function deleteFarmAction(formData: FormData) {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN"],
  });

  if (!tenantContext) {
    redirect("/farms?error=tenant");
  }

  const farmId = formData.get("farmId");

  if (typeof farmId !== "string" || !farmId) {
    redirect("/farms?error=missing_farm");
  }

  await deleteTenantFarm(tenantContext.tenant.id, farmId);

  revalidatePath("/dashboard");
  revalidatePath("/farms");
  redirect("/farms?success=deleted");
}
