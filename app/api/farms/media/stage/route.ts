import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getCurrentTenant } from "@/lib/auth/session";
import {
  createFarmUploadPath,
  MAX_SERVER_FARM_UPLOAD_BYTES,
  validateFarmUploadFile,
  type FarmUploadKind,
} from "@/lib/blob/farm-upload-policy";
import { prisma } from "@/lib/db/prisma";
import { hasTenantRole } from "@/lib/permissions/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };
const editorRoles = ["TENANT_OWNER", "TENANT_ADMIN", "FARM_MANAGER"] as const;

function hasImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
  }
  if (mime === "image/webp") {
    const ascii = (offset: number, value: string) =>
      [...value].every((character, index) => bytes[offset + index] === character.charCodeAt(0));
    return bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP");
  }
  return false;
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "Origen de solicitud no autorizado." }, { status: 403, headers: noStore });
  }

  const context = await getCurrentTenant();
  if (!context) {
    return NextResponse.json({ error: "Tu sesión ha vencido. Ingresa nuevamente." }, { status: 401, headers: noStore });
  }
  if (!hasTenantRole(context.membership.role, [...editorRoles])) {
    return NextResponse.json({ error: "Tu rol no permite modificar fincas." }, { status: 403, headers: noStore });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const farmId = url.searchParams.get("farmId") || null;
  const filename = url.searchParams.get("filename");
  const mime = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";

  if ((kind !== "primaryImage" && kind !== "logo") ||
      !filename || (farmId && (farmId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(farmId)))) {
    return NextResponse.json({ error: "Datos de carga inválidos." }, { status: 400, headers: noStore });
  }

  const suppliedLength = Number(request.headers.get("content-length") || "0");
  if (!Number.isFinite(suppliedLength) || suppliedLength > MAX_SERVER_FARM_UPLOAD_BYTES) {
    return NextResponse.json({ error: "La foto debe optimizarse antes de subirla." }, { status: 413, headers: noStore });
  }

  if (farmId) {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, tenantId: context.tenant.id },
      select: { id: true },
    });
    if (!farm) {
      return NextResponse.json({ error: "La finca no pertenece a tu empresa." }, { status: 404, headers: noStore });
    }
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 400, headers: noStore });
  }

  const validation = validateFarmUploadFile(kind as FarmUploadKind, filename, mime, bytes.byteLength);
  if (validation || bytes.byteLength > MAX_SERVER_FARM_UPLOAD_BYTES) {
    return NextResponse.json({
      error: validation || "La foto debe optimizarse antes de subirla.",
    }, { status: bytes.byteLength > MAX_SERVER_FARM_UPLOAD_BYTES ? 413 : 400, headers: noStore });
  }
  if (!hasImageSignature(new Uint8Array(bytes), mime)) {
    return NextResponse.json({ error: "El contenido de la imagen no coincide con su formato." },
      { status: 415, headers: noStore });
  }

  const pathname = createFarmUploadPath(
    { tenantId: context.tenant.id, userId: context.user.id, farmId, kind },
    filename,
    randomUUID(),
  );

  try {
    const stored = await put(pathname, new Blob([bytes], { type: mime }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: mime,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (stored.pathname !== pathname) {
      console.error("FARM_STAGE_PATH_MISMATCH");
      return NextResponse.json({ error: "No pudo verificarse la carga." }, { status: 503, headers: noStore });
    }
    return NextResponse.json({ pathname: stored.pathname }, { headers: noStore });
  } catch (error) {
    console.error("FARM_STAGE_UPLOAD_FAILED", error);
    return NextResponse.json({
      error: "El almacenamiento no respondió. Conservamos tus datos: intenta nuevamente.",
    }, { status: 503, headers: noStore });
  }
}
