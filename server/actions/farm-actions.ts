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

function optionalUploadPath(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 350) throw new Error("INVALID_UPLOAD_PATH");
  return value;
}

export async function createFarmAction(formData: FormData): Promise<{ error: string } | void> {
  const { user, tenantContext } = await requireRole({ tenant: [...allowedRoles] });
  if (!tenantContext) redirect("/farms?error=tenant");

  const parsed = farmSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    hectares: formData.get("hectares"),
  });
  if (!parsed.success) return { error: "Revisa los datos de la finca." };

  let farm;
  try {
    farm = await createFarmForTenant(tenantContext.tenant.id, user.id, parsed.data, {
      primaryImagePath: optionalUploadPath(formData, "primaryImagePath"),
      logoPath: optionalUploadPath(formData, "logoPath"),
    });
  } catch (error) {
    console.error("FARM_CREATE_FAILED", error);
    return { error: "No se pudo crear la finca. Tus archivos no se han publicado; vuelve a intentarlo." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/farms");
  redirect("/farms/" + farm.id + "?success=created");
}

export async function updateFarmAction(formData: FormData): Promise<{ error: string } | void> {
  const { user, tenantContext } = await requireRole({ tenant: [...allowedRoles] });
  if (!tenantContext) redirect("/farms?error=tenant");

  const farmId = formData.get("farmId");
  if (typeof farmId !== "string" || !farmId) return { error: "No se identificó la finca." };

  const parsed = farmSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    hectares: formData.get("hectares"),
  });
  if (!parsed.success) return { error: "Revisa los datos de la finca." };

  try {
    await updateTenantFarm(tenantContext.tenant.id, farmId, parsed.data, {
      primaryImagePath: optionalUploadPath(formData, "primaryImagePath"),
      logoPath: optionalUploadPath(formData, "logoPath"),
    }, user.id);
  } catch (error) {
    console.error("FARM_UPDATE_FAILED", error);
    return { error: "No se pudo actualizar la finca. Conservamos las imágenes anteriores. Inténtalo nuevamente." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/farms");
  revalidatePath("/farms/" + farmId);
  redirect("/farms/" + farmId + "?success=updated");
}

export async function deleteFarmAction(formData: FormData) {
  const { tenantContext } = await requireRole({ tenant: ["TENANT_OWNER", "TENANT_ADMIN"] });
  if (!tenantContext) redirect("/farms?error=tenant");

  const farmId = formData.get("farmId");
  if (typeof farmId !== "string" || !farmId) redirect("/farms?error=missing_farm");

  await deleteTenantFarm(tenantContext.tenant.id, farmId);
  revalidatePath("/dashboard");
  revalidatePath("/farms");
  redirect("/farms?success=deleted");
}
