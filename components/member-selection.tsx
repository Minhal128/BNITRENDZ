"use client";

import { MessageCircle, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { btnSecondary } from "./ui";
import { WhatsAppComposer } from "./whatsapp-composer";

type Selection = { ids: Set<string>; all: boolean };
type SelectionApi = {
  pageIds: string[];
  selection: Selection;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  togglePage: () => void;
  selectAllMatching: () => void;
  clear: () => void;
};

const SelectionContext = createContext<SelectionApi | null>(null);
const useSelection = () => useContext(SelectionContext)!;
const checkboxCls = "size-4 cursor-pointer accent-red-600";

/** Holds the checked members. `all` means every member matching the current search, across pages. */
export function SelectionProvider({ pageIds, children }: { pageIds: string[]; children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ ids: new Set(), all: false });
  const isSelected = (id: string) => selection.all || selection.ids.has(id);
  const pageSelected = pageIds.every(isSelected);

  const api: SelectionApi = {
    pageIds,
    selection,
    isSelected,
    toggle: (id) =>
      setSelection(({ ids, all }) => {
        // Unticking a row while "all" is on keeps the rest of this page selected.
        const next = new Set(all ? pageIds : ids);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ids: next, all: false };
      }),
    togglePage: () =>
      setSelection(({ ids }) => {
        const next = new Set(ids);
        for (const id of pageIds) {
          if (pageSelected) next.delete(id);
          else next.add(id);
        }
        return { ids: next, all: false };
      }),
    selectAllMatching: () => setSelection(({ ids }) => ({ ids, all: true })),
    clear: () => setSelection({ ids: new Set(), all: false }),
  };
  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>;
}

export function SelectPageCheckbox() {
  const { pageIds, isSelected, togglePage } = useSelection();
  const count = pageIds.filter(isSelected).length;
  return (
    <input
      type="checkbox"
      aria-label="Select all members on this page"
      checked={count > 0 && count === pageIds.length}
      ref={(el) => {
        if (el) el.indeterminate = count > 0 && count < pageIds.length;
      }}
      onChange={togglePage}
      className={checkboxCls}
    />
  );
}

export function SelectMemberCheckbox({ id, name }: { id: string; name: string }) {
  const { isSelected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      aria-label={`Select ${name}`}
      checked={isSelected(id)}
      onChange={() => toggle(id)}
      className={checkboxCls}
    />
  );
}

export function SelectionBar({ total, search }: { total: number; search: string }) {
  const { pageIds, selection, isSelected, selectAllMatching, clear } = useSelection();
  const [composing, setComposing] = useState(false);
  const count = selection.all ? total : selection.ids.size;
  if (count === 0) return null;
  const offerAll = !selection.all && pageIds.every(isSelected) && total > pageIds.length;

  return (
    <div
      role="region"
      aria-label="Selected members"
      className="sticky top-[4.25rem] z-20 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:top-4"
    >
      <p className="text-sm text-red-950">
        <strong>{count}</strong> {count === 1 ? "member" : "members"} selected
        {selection.all && (search ? ` (all matching “${search}”)` : " (all members)")}
        {offerAll && (
          <button type="button" onClick={selectAllMatching} className="ml-2 font-semibold text-red-700 underline hover:text-red-800">
            Select all {total}
          </button>
        )}
      </p>
      <div className="flex gap-2">
        <button type="button" className={`${btnSecondary} flex-1 sm:flex-none`} onClick={clear}>
          <X className="size-4" aria-hidden /> Clear
        </button>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none sm:flex-none"
        >
          <MessageCircle className="size-4" aria-hidden /> Send WhatsApp
        </button>
      </div>
      {composing && (
        <WhatsAppComposer
          recipients={{ memberIds: [...selection.ids], all: selection.all, search, count }}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}
