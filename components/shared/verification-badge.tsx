import type { VerificationStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const styles: Record<
  VerificationStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  IN_REVIEW: {
    label: "In review",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  REQUIRES_FIX: {
    label: "Requires fix",
    className: "border-orange-200 bg-orange-50 text-orange-800",
  },
  VERIFIED: {
    label: "Verified",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  REJECTED: {
    label: "Rejected",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

type VerificationBadgeProps = {
  status: VerificationStatus;
};

export function VerificationBadge({ status }: VerificationBadgeProps) {
  const config = styles[status];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
