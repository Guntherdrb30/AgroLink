import { get } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canReadPrivateFile } from "@/lib/blob/private-file-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "private, no-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "Cache-Control": NO_STORE },
    });
  }

  const { fileId } = await params;
  const document = await prisma.verificationDocument.findUnique({
    where: { id: fileId },
    include: { file: true },
  });
  const file = document?.file;
  if (!file || !document || document.tenantId !== file.tenantId ||
      !canReadPrivateFile(file, currentUser)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": NO_STORE },
    });
  }

  const result = await get(file.path, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": NO_STORE },
    });
  }

  const safeName = file.originalName.replace(/[\r\n"\\]/g, "_").slice(0, 160) || "documento";
  const image = ["image/jpeg", "image/png", "image/webp"].includes(file.mimeType);
  const contentType = image ? file.mimeType : "application/octet-stream";
  return new Response(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${image ? "inline" : "attachment"}; filename="${safeName}"`,
      "Content-Security-Policy": "sandbox",
      "Cache-Control": NO_STORE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
