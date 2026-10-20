import type { Metadata } from "next";
import { PreviewEnvironmentNotice } from "@/components/auth/preview-environment-notice";

export const metadata: Metadata = {
  title: "Acceso Preview en preparación",
  robots: { index: false, follow: false },
};

export default function PreviewConfigurationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9f7] px-5 py-12">
      <PreviewEnvironmentNotice />
    </main>
  );
}
