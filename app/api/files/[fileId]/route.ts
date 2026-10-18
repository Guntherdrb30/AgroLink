import { get } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canReadPrivateFile } from "@/lib/blob/private-file-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "private, no-store";

function blocked(status: number) {
  return new Response(status === 401 ? "Unauthorized" : "Not found", {
    status,
    headers: { "Cache-Control": NO_STORE },
  });
}

/**
 * Only database IDs are accepted from the browser. Never return Blob provider
 * URLs or trust user-provided tenant IDs/pathnames for access decisions.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return blocked(401);

  const { fileId } = await params;
  const file = await prisma.fileStorage.findUnique({
    where: { id: fileId },
    include: {
      verificationDocuments: {
        select: { tenantId: true, profileId: true },
        take: 2,
      },
    },
  });

  // This endpoint deliberately exposes verification documents only.
  // Each document must belong to the exact same tenant as its Blob record.
  if (
    !file ||
    !file.tenantId ||
    file.usage !== "VERIFICATION_DOCUMENT" ||
    file.visibility !== "PRIVATE" ||
    file.verificationDocuments.length !== 1 ||
    file.verificationDocuments[0].tenantId !== file.tenantId ||
    !file.path.startsWith(`agrolynk/tenants/${file.tenantId}/private/verification/`) ||
    !canReadPrivateFile(file, currentUser)
  ) return blocked(404);

  try {
    const blob = await get(file.path, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (!blob || blob.statusCode !== 200) return blocked(404);

    const safeName = file.originalName.replace(/[\r\n"\\]/g, "_").slice(0, 160) || "documento";
    const mime = ["image/jpeg", "image/png", "image/webp"].includes(file.mimeType)
      ? file.mimeType
      : "application/octet-stream";
    return new Response(blob.stream, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${mime.startsWith("image/") ? "inline" : "attachment"}; filename="${safeName}"`,
        "Content-Security-Policy": "sandbox",
        "Cache-Control": NO_STORE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Private storage unavailable", {
      status: 503,
      headers: { "Cache-Control": NO_STORE },
    });
  }
}
