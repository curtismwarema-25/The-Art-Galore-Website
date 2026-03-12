import { Search } from "lucide-react";
import { formInputClassName } from "@/lib/formStyles";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchInput({ value, onChange, placeholder = "Search" }: SearchInputProps) {
  return (
    <label className="relative block w-full">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${formInputClassName} pl-9 pr-3`}
      />
    </label>
  );
}
