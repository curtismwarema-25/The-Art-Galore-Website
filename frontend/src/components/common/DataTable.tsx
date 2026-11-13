import type { ReactNode } from "react";

type DataTableProps = {
  headers: string[];
  children: ReactNode;
  minWidthClassName?: string;
};

export default function DataTable({ headers, children, minWidthClassName = "min-w-[640px]" }: DataTableProps) {
  return (
    <div
      className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-background/50 p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/40 md:p-3"
      role="region"
      aria-label={`${headers.join(", ")} data table`}
      tabIndex={0}
    >
      <table className={`w-full ${minWidthClassName} border-separate border-spacing-y-2`}>
        <thead>
          <tr className="text-left">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-3 py-2 text-[11px] font-display tracking-[0.18em] uppercase text-foreground-secondary"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
