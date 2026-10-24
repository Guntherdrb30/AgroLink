import type { FileCategory, FileUsage, FileVisibility } from "@prisma/client";

export type UploadUsageKey =
  | "verification_document"
  | "sale_permit"
  | "livestock_image"
  | "listing_image"
  | "import_file"
  | "manual_file"
  | "report_file"
  | "farm_primary_image"
  | "farm_logo"
  | "farm_iron"
  | "operation_sheet";

type UploadProfile = {
  usage: FileUsage;
  category: FileCategory;
  visibility: FileVisibility;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  pathSegment: string;
};

export const uploadProfiles: Record<UploadUsageKey, UploadProfile> = {
  sale_permit: { usage:"SALE_PERMIT",category:"DOCUMENT",visibility:"PRIVATE",maxSizeBytes:15*1024*1024,allowedMimeTypes:["application/pdf","image/jpeg","image/png","image/webp"],pathSegment:"sales/insai-permits" },
  verification_document: {
    usage: "VERIFICATION_DOCUMENT",
    category: "DOCUMENT",
    visibility: "PRIVATE",
    maxSizeBytes: 15 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
    pathSegment: "verification",
  },
  livestock_image: {
    usage: "LIVESTOCK_IMAGE",
    category: "IMAGE",
    visibility: "PUBLIC",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    pathSegment: "livestock",
  },
  listing_image: {
    usage: "LISTING_IMAGE",
    category: "IMAGE",
    visibility: "PUBLIC",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    pathSegment: "listings",
  },
  import_file: {
    usage: "IMPORT_FILE",
    category: "SPREADSHEET",
    visibility: "PRIVATE",
    maxSizeBytes: 20 * 1024 * 1024,
    allowedMimeTypes: [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
    ],
    pathSegment: "imports",
  },
  manual_file: {
    usage: "MANUAL_FILE",
    category: "PDF",
    visibility: "PUBLIC",
    maxSizeBytes: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
    pathSegment: "manuals",
  },
  report_file: {
    usage: "REPORT_FILE",
    category: "PDF",
    visibility: "PRIVATE",
    maxSizeBytes: 20 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    pathSegment: "reports",
  },
  farm_primary_image: {
    usage: "FARM_PRIMARY_IMAGE",
    category: "IMAGE",
    visibility: "PRIVATE",
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    pathSegment: "farms/primary-images",
  },
  farm_iron: {usage:"FARM_IRON",category:"IMAGE",visibility:"PRIVATE",maxSizeBytes:5*1024*1024,allowedMimeTypes:["image/png","image/jpeg","image/webp"],pathSegment:"farms/irons"},
  farm_logo: {
    usage: "FARM_LOGO",
    category: "IMAGE",
    visibility: "PRIVATE",
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    pathSegment: "farms/logos",
  },
  operation_sheet: {
    usage: "OPERATION_SHEET",
    category: "DOCUMENT",
    visibility: "PRIVATE",
    maxSizeBytes: 20 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    pathSegment: "operations/sheets",
  },
};

export function getUploadProfile(usage: UploadUsageKey) {
  return uploadProfiles[usage];
}
