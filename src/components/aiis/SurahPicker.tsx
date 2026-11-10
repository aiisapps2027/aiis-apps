import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SURAH, getSurah } from "@/lib/quran";

/** Searchable surah selector (type a name like "jinn" or a number like "72"). */
export function SurahPicker({ value, onChange, placeholder = "Pilih surah" }: { value: number | null; onChange: (no: number) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const cur = value ? getSurah(value) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-11 w-full justify-between rounded-xl bg-card font-normal">
          <span className={cn("truncate", !cur && "text-muted-foreground")}>{cur ? `${cur.no}. ${cur.latin}` : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command>
          <CommandInput placeholder="Cari nama atau nomor surah..." />
          <CommandList>
            <CommandEmpty>Surah tidak ditemukan</CommandEmpty>
            <CommandGroup>
              {SURAH.map((s) => (
                <CommandItem
                  key={s.no}
                  value={`${s.no} ${s.latin}`}
                  onSelect={() => {
                    onChange(s.no);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === s.no ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{s.no}. {s.latin}</span>
                  <span className="text-xs text-muted-foreground">{s.ayat} ayat</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
