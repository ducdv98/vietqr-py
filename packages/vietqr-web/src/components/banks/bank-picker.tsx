"use client";

import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import { searchBanks } from "@/lib/banks/search";
import type { Bank } from "@/lib/banks/queries";
import { BankLogo } from "./bank-logo";

export type BankPickerProps = {
  /** The catalog to choose from (e.g. from `useBanks().data`). Empty while loading. */
  banks: readonly Bank[];
  /** Selected bank, as its BIN or code (case-insensitive); null/undefined for none. */
  value: string | null | undefined;
  /** Called with the chosen bank, or null when cleared. */
  onChange: (bank: Bank | null) => void;
  /** Id for the input, so an external <label htmlFor> can name it. */
  id?: string;
  /** Accessible name when there is no external label. */
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  /** Shows a loading placeholder instead of the catalog. */
  loading?: boolean;
};

const findBank = (banks: readonly Bank[], v: string | null | undefined) => {
  if (!v) return null;
  const k = v.toLowerCase();
  return banks.find((b) => b.bin === v || b.code.toLowerCase() === k) ?? null;
};

/**
 * Searchable bank combobox (WAI-ARIA 1.2 editable combobox with list autocomplete). Typing
 * filters with the same diacritic-insensitive search as the Banks page; Up/Down move,
 * Enter selects, Escape closes, Home/End jump.
 */
export function BankPicker({
  banks,
  value,
  onChange,
  id,
  disabled,
  loading,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: BankPickerProps) {
  const t = useTranslations("Banks");
  const uid = useId();
  const inputId = id ?? `${uid}-input`;
  const listId = `${uid}-list`;
  const optionId = (i: number) => `${uid}-opt-${i}`;
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = findBank(banks, value);
  const [open, setOpen] = useState(false);
  // null = show the selected bank's name; string = the user is typing a query.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => (query === null ? [...banks] : searchBanks(banks, query)),
    [banks, query],
  );
  const text =
    query ?? (selected ? `${selected.shortName} - ${selected.name}` : "");
  const activeIndex = Math.min(active, Math.max(results.length - 1, 0));

  const close = () => {
    setOpen(false);
    setQuery(null);
  };
  const choose = (bank: Bank) => {
    onChange(bank);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive(Math.min(activeIndex + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive(Math.max(activeIndex - 1, 0));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(results.length - 1);
        }
        break;
      case "Enter":
        if (open && results[activeIndex]) {
          e.preventDefault();
          choose(results[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
        {selected && query === null ? (
          <BankLogo
            logo={selected.logo}
            code={selected.code}
            className="size-6"
          />
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          type="text"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0 ? optionId(activeIndex) : undefined
          }
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          disabled={disabled}
          placeholder={loading ? t("picker.loading") : t("picker.placeholder")}
          value={text}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={(e) => e.target.select()}
          onClick={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        {selected && !disabled ? (
          <button
            type="button"
            aria-label={t("picker.clear")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange(null);
              close();
              inputRef.current?.focus();
            }}
            className="rounded p-1 hover:bg-accent"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
        <ChevronsUpDown aria-hidden className="size-4 text-muted-foreground" />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={ariaLabel ?? t("listLabel")}
        hidden={!open}
        className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-md"
      >
        {open && results.length === 0 ? (
          <li
            role="presentation"
            className="px-3 py-2 text-sm text-muted-foreground"
          >
            {t("picker.noResults")}
          </li>
        ) : null}
        {open
          ? results.map((b, i) => (
              <li
                key={b.bin}
                id={optionId(i)}
                role="option"
                aria-selected={b.bin === selected?.bin}
                // Keep focus in the input so blur does not close the list before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(b)}
                onMouseMove={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${
                  i === activeIndex ? "bg-accent" : ""
                }`}
              >
                <BankLogo logo={b.logo} code={b.code} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {b.shortName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.code} · {b.bin}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {b.name}
                  </span>
                </span>
                {b.bin === selected?.bin ? (
                  <Check aria-hidden className="size-4" />
                ) : null}
              </li>
            ))
          : null}
      </ul>
    </div>
  );
}
