import { InstitutionalWhatsAppButton } from "@/components/shared/institutional-whatsapp-button";

export function FloatingWhatsAppButton() {
  return (
    <div className="fixed bottom-5 right-5 z-50 md:bottom-8 md:right-8">
      <InstitutionalWhatsAppButton className="rounded-full border-primary/20 bg-background shadow-[0_18px_45px_rgba(31,41,51,0.14)]" />
    </div>
  );
}
