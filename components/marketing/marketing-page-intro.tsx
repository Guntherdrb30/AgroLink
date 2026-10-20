type MarketingPageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function MarketingPageIntro({ eyebrow, title, description }: MarketingPageIntroProps) {
  return (
    <section className="border-b border-[#e9e5dd] bg-[linear-gradient(135deg,#fbfaf7_0%,#ffffff_76%)]">
      <div className="container space-y-5 px-5 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#84662f]">{eyebrow}</p>
        <h1 className="max-w-4xl text-4xl font-bold leading-[1.12] tracking-tight text-[#1d2823] sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="max-w-2xl text-base leading-8 text-[#5d666b] sm:text-lg">{description}</p>
      </div>
    </section>
  );
}
