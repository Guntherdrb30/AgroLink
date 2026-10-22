"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOperationalTenant, requireRole } from "@/lib/auth/session";
import { assertFarmScope, assertOperationScope, assertOperationAnimalScope } from "@/lib/permissions/assert-farm-scope";
import {
  livestockOperationSchema,
  operationAnimalResultSchema,
  operationExpenseSchema,
  operationWorkerSchema,
} from "@/lib/validators/livestock-operation";
import {
  addOperationExpenseForTenant,
  addOperationWorkerForTenant,
  applyOperationResultsForTenant,
  createLivestockOperationForTenant,
  generateOperationExcelForTenant,
  generateOperationPdfForTenant,
  importOperationExcelForTenant,
  saveOperationAnimalResultForTenant,
} from "@/server/services/livestock-operation-service";

const managementRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER", "OPERATOR"] as const;
const adminRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

function parseBoolean(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export async function createLivestockOperationAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const parsed = livestockOperationSchema.safeParse({
    title: formData.get("title"),
    farmId: formData.get("farmId"),
    operationDate: formData.get("operationDate"),
    plannedTypes: formData.getAll("plannedTypes"),
    notes: formData.get("notes"),
    includeAllFarmAnimals: parseBoolean(formData.get("includeAllFarmAnimals")),
    animalIds: formData.getAll("animalIds"),
  });

  if (!parsed.success) {
    redirect("/operations?error=validation");
  }

  await assertFarmScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, parsed.data.farmId);
  const operation = await createLivestockOperationForTenant(
    tenantContext.tenant.id,
    user.id,
    parsed.data,
  );

  revalidatePath("/operations");
  redirect(`/operations/${operation.id}?success=created`);
}

export async function generateOperationPdfSheetAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const operationId = String(formData.get("operationId") ?? "");
  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, operationId);
  const file = await generateOperationPdfForTenant(
    tenantContext.tenant.id,
    user.id,
    operationId,
  );

  revalidatePath("/operations");
  revalidatePath(`/operations/${operationId}`);
  redirect(file.url);
}

export async function generateOperationExcelSheetAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const operationId = String(formData.get("operationId") ?? "");
  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, operationId);
  const file = await generateOperationExcelForTenant(
    tenantContext.tenant.id,
    user.id,
    operationId,
  );

  revalidatePath("/operations");
  revalidatePath(`/operations/${operationId}`);
  redirect(file.url);
}

export async function importOperationExcelAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const operationId = String(formData.get("operationId") ?? "");
  const file = formData.get("resultsFile");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`/operations/${operationId}?error=missing_file`);
  }

  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, operationId);
  await importOperationExcelForTenant(
    tenantContext.tenant.id,
    user.id,
    operationId,
    file,
  );

  revalidatePath("/operations");
  revalidatePath(`/operations/${operationId}`);
  redirect(`/operations/${operationId}?success=imported`);
}

export async function saveOperationAnimalResultAction(formData: FormData) {
  const { tenantContext } = await requireRole({
    tenant: [...managementRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const operationId = String(formData.get("operationId") ?? "");
  const lookup = String(formData.get("lookupCode") ?? "");
  const parsed = operationAnimalResultSchema.safeParse({
    operationAnimalId: formData.get("operationAnimalId"),
    weightKg: formData.get("weightKg"),
    vaccineName: formData.get("vaccineName"),
    dewormingName: formData.get("dewormingName"),
    treatmentName: formData.get("treatmentName"),
    observations: formData.get("observations"),
    generalStatus: formData.get("generalStatus"),
    skipped: parseBoolean(formData.get("skipped")),
  });

  if (!parsed.success) {
    redirect(`/operations/${operationId}?error=result_validation`);
  }

  await assertOperationAnimalScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, operationId, parsed.data.operationAnimalId);
  await saveOperationAnimalResultForTenant(tenantContext.tenant.id, parsed.data);
  revalidatePath(`/operations/${operationId}`);
  redirect(
    lookup
      ? `/operations/${operationId}?lookup=${encodeURIComponent(lookup)}&success=captured`
      : `/operations/${operationId}?success=captured`,
  );
}

export async function addOperationExpenseAction(formData: FormData) {
  const { tenantContext } = await requireRole({
    tenant: [...adminRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const parsed = operationExpenseSchema.safeParse({
    operationId: formData.get("operationId"),
    label: formData.get("label"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(`/operations/${String(formData.get("operationId") ?? "")}?error=expense_validation`);
  }

  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, parsed.data.operationId);
  await addOperationExpenseForTenant(tenantContext.tenant.id, parsed.data);
  revalidatePath(`/operations/${parsed.data.operationId}`);
}

export async function addOperationWorkerAction(formData: FormData) {
  const { tenantContext } = await requireRole({
    tenant: [...adminRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const parsed = operationWorkerSchema.safeParse({
    operationId: formData.get("operationId"),
    employeeId: formData.get("employeeId"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    redirect(`/operations/${String(formData.get("operationId") ?? "")}?error=worker_validation`);
  }

  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, parsed.data.operationId);
  await addOperationWorkerForTenant(tenantContext.tenant.id, parsed.data);
  revalidatePath(`/operations/${parsed.data.operationId}`);
}

export async function applyOperationResultsAction(formData: FormData) {
  const { user, tenantContext } = await requireRole({
    tenant: [...adminRoles],
  });
  await requireOperationalTenant();

  if (!tenantContext) {
    redirect("/operations?error=tenant");
  }

  const operationId = String(formData.get("operationId") ?? "");
  await assertOperationScope({ tenantId: tenantContext.tenant.id, userId: tenantContext.user.id, role: tenantContext.membership.role }, operationId);
  await applyOperationResultsForTenant(tenantContext.tenant.id, user.id, operationId);
  revalidatePath("/operations");
  revalidatePath(`/operations/${operationId}`);
  redirect(`/operations/${operationId}?success=applied`);
}
