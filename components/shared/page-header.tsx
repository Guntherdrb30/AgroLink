type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold leading-tight text-balance md:text-5xl">
        {title}
      </h1>
      <p className="text-base leading-7 text-muted-foreground md:text-lg">
        {description}
      </p>
    </div>
  );
}
