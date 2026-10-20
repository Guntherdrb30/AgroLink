import Link from "next/link";
import { MessageCircleMore } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type InstitutionalWhatsAppButtonProps = {
  className?: string;
};

// Do not display an action linking to the former test number. Configure a
// verified business number before offering WhatsApp as a public contact option.
export function InstitutionalWhatsAppButton({ className }: InstitutionalWhatsAppButtonProps) {
  const phoneNumber = (process.env.NEXT_PUBLIC_GANADIA_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(phoneNumber) || /^0+$/.test(phoneNumber)) return null;

  const href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent("Hola, quisiera información sobre GanadIA.")}`;
  return (
    <Button asChild variant="outline" size="sm" className={cn("gap-2", className)}>
      <Link href={href} target="_blank" rel="noopener noreferrer" aria-label="Contactar con GanadIA por WhatsApp">
        <MessageCircleMore className="size-4" aria-hidden="true" />
        WhatsApp
      </Link>
    </Button>
  );
}
