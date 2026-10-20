import { InstitutionalWhatsAppButton } from "@/components/shared/institutional-whatsapp-button";

// Hide the floating button on phones: it previously covered the primary CTA.
// The mobile header's Contacto page remains accessible without an overlay.
export function FloatingWhatsAppButton() {
  return (
    <div className="fixed bottom-8 right-8 z-30 hidden lg:block">
      <InstitutionalWhatsAppButton className="rounded-full border-primary/20 bg-background shadow-[0_18px_45px_rgba(31,41,51,0.14)]" />
    </div>
  );
}
