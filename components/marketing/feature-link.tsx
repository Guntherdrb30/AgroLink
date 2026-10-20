import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentType } from "react";

type FeatureLinkProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function FeatureLink({ href, eyebrow, title, description, icon: Icon }: FeatureLinkProps) {
  return (
    <Link href={href} className="group flex h-full flex-col rounded-[26px] border border-[#e9e5dd] bg-white p-6 shadow-[0_12px_38px_rgba(28,33,29,0.035)] transition-all duration-200 hover:-translate-y-1 hover:border-[#c4ad87] hover:shadow-[0_18px_46px_rgba(28,33,29,0.085)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
      <div className="mb-7 flex items-start justify-between">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f3eee4] text-[#84662f]">
          <Icon className="size-6" aria-hidden={true} />
        </span>
        <ArrowUpRight className="size-5 text-[#806a4b] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#84662f]">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-bold tracking-tight text-[#1f2933]">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[#66737f]">{description}</p>
      <span className="mt-auto pt-7 text-sm font-semibold text-[#84662f]">Conocer más →</span>
    </Link>
  );
}
