import Link from "next/link";
import { ShieldAlert, ArrowLeft, Database } from "lucide-react";

export function PreviewEnvironmentNotice() {
  return (
    <section className="w-full max-w-lg rounded-[28px] border border-[#e6dfd1] bg-white p-6 shadow-[0_14px_45px_rgba(28,33,29,0.07)] sm:p-9">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#f5eee1] text-[#84662f]">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#84662f]">GanadIA · Entorno Preview</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#1d2823]">Las pruebas de acceso están temporalmente protegidas.</h1>
      <p className="mt-4 text-base leading-7 text-[#56616b]">
        Estamos preparando una base de datos independiente para poder iniciar sesión,
        crear usuarios de prueba y utilizar el panel sin afectar tu información real.
        No es un fallo de Google ni de tu cuenta.
      </p>
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f8f5ef] p-4 text-sm leading-6 text-[#4b514c]">
        <Database className="mt-0.5 size-5 shrink-0 text-[#84662f]" aria-hidden="true" />
        <span>El sitio público puede revisarse normalmente. Las funciones privadas permanecerán protegidas hasta completar la configuración de Preview.</span>
      </div>
      <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#70572f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5c4726]">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver al inicio
      </Link>
    </section>
  );
}
