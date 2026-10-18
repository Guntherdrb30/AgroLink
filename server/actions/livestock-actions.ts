"use server";

import { reproductionRecordSchema } from "@/lib/validators/reproduction";
import { registerReproductionEvent } from "@/server/services/livestock-reproduction-service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import {
  animalEventSchema,
  animalSchema,
  animalTreatmentSchema,
  animalVaccinationSchema,
  animalWeightSchema,
} from "@/lib/validators/livestock";
import {
  addAnimalEventForTenant,
  addAnimalTreatmentForTenant,
  addAnimalVaccinationForTenant,
  addAnimalWeightRecordForTenant,
  createAnimalForTenant,
  deleteAnimalForTenant,
  updateAnimalForTenant,
} from "@/server/services/livestock-service";

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

function extractPhotos(formData: FormData) {
  return formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function createAnimalAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const parsed = animalSchema.safeParse({
    internalCode: formData.get("internalCode"),
    visualIdentification: formData.get("visualIdentification"),
    chipCode: formData.get("chipCode"),
    speciesName: formData.get("speciesName"),
    breedName: formData.get("breedName"),
    sex: formData.get("sex"),
    birthDate: formData.get("birthDate"),
    estimatedAgeMonths: formData.get("estimatedAgeMonths"),
    farmId: formData.get("farmId"),
    lotOrZone: formData.get("lotOrZone"),
    productiveLine: formData.get("productiveLine"),
    fatherId: formData.get("fatherId"),
    motherId: formData.get("motherId"),
    initialWeightKg: formData.get("initialWeightKg"),
    currentWeightKg: formData.get("currentWeightKg"),
    healthStatus: formData.get("healthStatus"),
    reproductiveStatus: formData.get("reproductiveStatus"),
    origin: formData.get("origin"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect("/livestock?error=validation");
  }

  const animal = await createAnimalForTenant(
    tenantContext.tenant.id,
    user.id,
    parsed.data,
    extractPhotos(formData),
  );

  revalidatePath("/dashboard");
  revalidatePath("/livestock");
  redirect(`/livestock/${animal.id}?success=created`);
}

export async function updateAnimalAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const animalId = formData.get("animalId");

  if (typeof animalId !== "string" || !animalId) {
    redirect("/livestock?error=missing_animal");
  }

  const parsed = animalSchema.safeParse({
    internalCode: formData.get("internalCode"),
    visualIdentification: formData.get("visualIdentification"),
    chipCode: formData.get("chipCode"),
    speciesName: formData.get("speciesName"),
    breedName: formData.get("breedName"),
    sex: formData.get("sex"),
    birthDate: formData.get("birthDate"),
    estimatedAgeMonths: formData.get("estimatedAgeMonths"),
    farmId: formData.get("farmId"),
    lotOrZone: formData.get("lotOrZone"),
    productiveLine: formData.get("productiveLine"),
    fatherId: formData.get("fatherId"),
    motherId: formData.get("motherId"),
    initialWeightKg: formData.get("initialWeightKg"),
    currentWeightKg: formData.get("currentWeightKg"),
    healthStatus: formData.get("healthStatus"),
    reproductiveStatus: formData.get("reproductiveStatus"),
    origin: formData.get("origin"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(`/livestock/${animalId}?error=validation`);
  }

  await updateAnimalForTenant(
    tenantContext.tenant.id,
    user.id,
    animalId,
    parsed.data,
    extractPhotos(formData),
  );

  revalidatePath("/livestock");
  revalidatePath(`/livestock/${animalId}`);
  redirect(`/livestock/${animalId}?success=updated`);
}

export async function deleteAnimalAction(formData: FormData) {
  const { tenantContext } = await requireRole({
    tenant: ["TENANT_OWNER", "TENANT_ADMIN"],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const animalId = formData.get("animalId");

  if (typeof animalId !== "string" || !animalId) {
    redirect("/livestock?error=missing_animal");
  }

  await deleteAnimalForTenant(tenantContext.tenant.id, animalId);
  revalidatePath("/livestock");
  redirect("/livestock?success=deleted");
}

export async function addAnimalEventAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const parsed = animalEventSchema.safeParse({
    animalId: formData.get("animalId"),
    eventType: formData.get("eventType"),
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
  });

  if (!parsed.success) {
    redirect(`/livestock/${String(formData.get("animalId") ?? "")}?error=event_validation`);
  }

  await addAnimalEventForTenant(tenantContext.tenant.id, user.id, parsed.data);
  revalidatePath(`/livestock/${parsed.data.animalId}`);
}

export async function addAnimalWeightAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const parsed = animalWeightSchema.safeParse({
    animalId: formData.get("animalId"),
    weightKg: formData.get("weightKg"),
    recordedAt: formData.get("recordedAt"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect(`/livestock/${String(formData.get("animalId") ?? "")}?error=weight_validation`);
  }

  await addAnimalWeightRecordForTenant(tenantContext.tenant.id, user.id, parsed.data);
  revalidatePath("/livestock");
  revalidatePath(`/livestock/${parsed.data.animalId}`);
}

export async function addAnimalVaccinationAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const parsed = animalVaccinationSchema.safeParse({
    animalId: formData.get("animalId"),
    vaccineName: formData.get("vaccineName"),
    appliedAt: formData.get("appliedAt"),
    dose: formData.get("dose"),
    batch: formData.get("batch"),
    nextDueAt: formData.get("nextDueAt"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect(`/livestock/${String(formData.get("animalId") ?? "")}?error=vaccination_validation`);
  }

  await addAnimalVaccinationForTenant(tenantContext.tenant.id, user.id, parsed.data);
  revalidatePath(`/livestock/${parsed.data.animalId}`);
}

export async function addAnimalTreatmentAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/livestock?error=tenant");
  }

  const parsed = animalTreatmentSchema.safeParse({
    animalId: formData.get("animalId"),
    treatmentName: formData.get("treatmentName"),
    appliedAt: formData.get("appliedAt"),
    diagnosis: formData.get("diagnosis"),
    medicine: formData.get("medicine"),
    dose: formData.get("dose"),
    withdrawalUntil: formData.get("withdrawalUntil"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect(`/livestock/${String(formData.get("animalId") ?? "")}?error=treatment_validation`);
  }

  await addAnimalTreatmentForTenant(tenantContext.tenant.id, user.id, parsed.data);
  revalidatePath(`/livestock/${parsed.data.animalId}`);
}

export async function addReproductionRecordAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({ tenant: [...managementRoles] });
  await requireOperationalTenant();
  if (!tenantContext) redirect("/livestock?error=tenant");
  const parsed = reproductionRecordSchema.safeParse({
    animalId: formData.get("animalId"),
    kind: formData.get("kind"),
    eventDate: formData.get("eventDate"),
    method: formData.get("method") || undefined,
    pregnancyResult: formData.get("pregnancyResult") || undefined,
    sireCode: formData.get("sireCode") || undefined,
    sireId: formData.get("sireId") || undefined,
    calfCode: formData.get("calfCode") || undefined,
    calfSex: formData.get("calfSex") || undefined,
    nextCheckAt: formData.get("nextCheckAt") || undefined,
    expectedCalvingAt: formData.get("expectedCalvingAt") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) redirect(`/livestock/${String(formData.get("animalId") ?? "")}?error=reproduction_validation`);
  try {
    await registerReproductionEvent(tenantContext.tenant.id, user.id, parsed.data);
  } catch {
    redirect(`/livestock/${parsed.data.animalId}?error=reproduction_failed`);
  }
  revalidatePath("/livestock");
  revalidatePath(`/livestock/${parsed.data.animalId}`);
  redirect(`/livestock/${parsed.data.animalId}?success=reproduction`);
}
