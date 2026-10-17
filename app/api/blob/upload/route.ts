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

  try {
    const storedFile = await storeFile({
      tenantId: context.tenant.id,
      uploadedById: context.user.id,
      file,
      usage: parsed.data.usage,
      // Never allow the client to downgrade a private file classification.
      visibility: undefined,
      label: parsed.data.label,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
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
