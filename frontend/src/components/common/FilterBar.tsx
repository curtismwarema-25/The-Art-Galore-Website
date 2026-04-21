import SearchInput from "@/components/common/SearchInput";
import { formLabelClassName, formSelectClassName } from "@/lib/formStyles";

export type FilterOption = {
  label: string;
  value: string;
};

type FilterControl = {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type FilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterControl[];
};

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters = [],
}: FilterBarProps) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3 md:p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <div className={filters.length ? "md:col-span-2" : "md:col-span-2 lg:col-span-4"}>
        <SearchInput value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>

      {filters.map((filter) => (
        <label key={filter.key} className="block">
          <span className={formLabelClassName}>
            {filter.label}
          </span>
          <select
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            className={formSelectClassName}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
