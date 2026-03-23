import Link from "next/link";
import { MessageCircleMore } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type InstitutionalWhatsAppButtonProps = {
  className?: string;
};

export function InstitutionalWhatsAppButton({
  className,
}: InstitutionalWhatsAppButtonProps) {
  return (
    <Button asChild variant="outline" size="sm" className={cn("gap-2", className)}>
      <Link
        href="https://wa.me/0000000000?text=Hola%20AgroLynk"
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircleMore className="size-4" />
        WhatsApp
      </Link>
    </Button>
  );
}
