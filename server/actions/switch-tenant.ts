"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth/session";
import { switchActiveTenant } from "@/server/services/tenant-service";

export async function switchTenantAction(formData: FormData) {
  const user = await requireAuth();
  const tenantId = formData.get("tenantId");

  if (typeof tenantId !== "string" || !tenantId) {
    return;
  }

  await switchActiveTenant(user.id, tenantId);
  revalidatePath("/dashboard");
}
