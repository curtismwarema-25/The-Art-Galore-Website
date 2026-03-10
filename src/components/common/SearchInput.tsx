import { Search } from "lucide-react";

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
        className="w-full border border-border bg-background text-foreground text-sm rounded-md pl-9 pr-3 py-2.5 font-body outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
      />
    </label>
  );
}
