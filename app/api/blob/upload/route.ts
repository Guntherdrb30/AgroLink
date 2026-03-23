import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fileUploadRequestSchema } from "@/lib/validators/file-storage";
import { storeFile } from "@/server/services/file-storage-service";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.defaultTenantId) {
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
      tenantId: session.user.defaultTenantId,
      uploadedById: session.user.id,
      file,
      usage: parsed.data.usage,
      visibility: parsed.data.visibility,
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
