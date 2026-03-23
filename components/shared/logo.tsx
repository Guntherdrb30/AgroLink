import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground">
        A
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold tracking-tight">AgroLynk</span>
        <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Trends172Tech
        </span>
      </span>
    </Link>
  );
}
