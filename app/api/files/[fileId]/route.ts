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

  // Fail closed until the private Blob SDK and lockfile upgrade is tested.
  // No fallback to the stored provider URL is permitted.
  return new Response("Private file serving not enabled", {
    status: 503,
    headers: { "Cache-Control": NO_STORE },
  });
}
