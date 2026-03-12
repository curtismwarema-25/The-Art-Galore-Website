export const formControlBaseClassName =
  "w-full rounded-md border border-border bg-background px-3.5 py-2.5 font-body text-sm leading-5 text-foreground transition-[border-color,box-shadow,background-color,color] duration-200 placeholder:text-foreground-secondary/70 placeholder:opacity-100 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-secondary/25 disabled:text-foreground-secondary disabled:placeholder:text-foreground-secondary/60 read-only:cursor-default read-only:bg-secondary/20 read-only:text-foreground-secondary";

export const formInputClassName = `${formControlBaseClassName} h-11`;

export const formSelectClassName = `${formControlBaseClassName} h-11 appearance-none pr-9`;

export const formTextareaClassName = `${formControlBaseClassName} min-h-[112px] resize-y py-3 leading-relaxed`;

export const formFileInputClassName =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-body text-foreground-secondary transition-[border-color,box-shadow,background-color,color] duration-200 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:border-accent file:mr-3 file:rounded-sm file:border-0 file:bg-accent/12 file:px-3 file:py-1.5 file:font-display file:text-[11px] file:tracking-[0.12em] file:uppercase file:text-foreground hover:file:bg-accent/18 disabled:cursor-not-allowed disabled:bg-secondary/25 disabled:text-foreground-secondary/60";

export const formLabelClassName =
  "block mb-1.5 text-[11px] font-display tracking-[0.16em] uppercase text-foreground-secondary";

export const formHelperTextClassName = "mt-1 text-xs text-foreground-secondary";

export const formErrorTextClassName = "mt-1 text-xs text-destructive";

export const formCheckboxClassName =
  "h-4 w-4 rounded border-border accent-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export const formCheckboxFieldClassName =
  "rounded-md border border-border bg-background px-4 py-3 flex items-center gap-2 text-sm text-foreground";
