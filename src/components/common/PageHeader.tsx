type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  compact?: boolean;
};

export default function PageHeader({ eyebrow, title, description, compact = false }: PageHeaderProps) {
  return (
    <header className={compact ? "mb-6" : "mb-10"}>
      {eyebrow && (
        <p className="font-display text-xs tracking-[0.3em] uppercase text-accent mb-3">
          {eyebrow}
        </p>
      )}
      <h1 className={compact ? "font-display text-3xl md:text-4xl text-foreground mb-3" : "text-display-xl mb-4"}>
        {title}
      </h1>
      {description && (
        <p className={compact ? "text-sm md:text-base text-foreground-secondary max-w-3xl" : "text-body-lg max-w-3xl"}>
          {description}
        </p>
      )}
    </header>
  );
}
