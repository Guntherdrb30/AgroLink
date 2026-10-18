import { NextResponse } from "next/server";

import { getCurrentTenant } from "@/lib/auth/session";
import { fileUploadRequestSchema } from "@/lib/validators/file-storage";
import { storeFile } from "@/server/services/file-storage-service";

export async function POST(request: Request) {
  const context = await getCurrentTenant();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const parsed = fileUploadRequestSchema.safeParse({
    usage: formData.get("usage"),
    label: formData.get("label"),
    entityType: formData.get("entityType"),
    entityId: formData.get("entityId"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  // Generic uploads cannot create private records or attach arbitrary entities.
  if (!["livestock_image", "listing_image", "farm_primary_image", "farm_logo"].includes(parsed.data.usage)) {
    return NextResponse.json({ error: "Use a purpose-specific upload flow" }, { status: 403 });
  }
  if (parsed.data.entityType || parsed.data.entityId || parsed.data.visibility) {
    return NextResponse.json({ error: "Entity and visibility are server-controlled" }, { status: 403 });
  }

  try {
    const storedFile = await storeFile({
      tenantId: context.tenant.id,
      uploadedById: context.user.id,
      file,
      usage: parsed.data.usage,
      // Never allow the client to downgrade a private file classification.
      visibility: undefined,
      label: parsed.data.label,
      entityType: undefined,
      entityId: undefined,
    });

    return NextResponse.json({ file: storedFile });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FILE_MIME_NOT_ALLOWED") {
        return NextResponse.json({ error: "File MIME type not allowed" }, { status: 415 });
      }

      if (error.message === "FILE_TOO_LARGE") {
        return NextResponse.json({ error: "File too large" }, { status: 413 });
      }
    }

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
