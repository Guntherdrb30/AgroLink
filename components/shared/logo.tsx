import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" aria-label="GanadIA — Tu finca, gestión inteligente." className="inline-flex shrink-0 items-center rounded-xl bg-[#17201b] px-2 py-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/ganadia-lockup.svg"
        alt="GanadIA — Tu finca, gestión inteligente."
        width="220"
        height="74"
        className="h-[50px] w-[152px] object-contain sm:h-[58px] sm:w-[183px]"
      />
    </Link>
  );
}
