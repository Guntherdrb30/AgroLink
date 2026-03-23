import type { FileUploadRequestInput } from "@/lib/validators/file-storage";

export async function uploadFileFromBrowser(
  file: File,
  payload: FileUploadRequestInput,
) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("usage", payload.usage);

  if (payload.label) {
    formData.set("label", payload.label);
  }

  if (payload.entityType) {
    formData.set("entityType", payload.entityType);
  }

  if (payload.entityId) {
    formData.set("entityId", payload.entityId);
  }

  if (payload.visibility) {
    formData.set("visibility", payload.visibility);
  }

  const response = await fetch("/api/blob/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("UPLOAD_FAILED");
  }

  return response.json();
}
