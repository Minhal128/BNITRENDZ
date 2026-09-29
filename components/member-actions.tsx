"use client";

import { LoaderCircle, QrCode, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { profileUrl } from "@/lib/format";
import { QrCard } from "./qr-card";
import { btnDanger, btnPrimary, btnSecondary, iconBtn } from "./ui";

/** Native <dialog>: focus trapping, Esc-to-close and the backdrop come from the browser. */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  return (
    <dialog
      ref={(el) => {
        if (el && !el.open) el.showModal();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-neutral-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            className={`${iconBtn} -mt-1 -mr-2`}
            aria-label="Close"
            onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function QrButton({ publicToken, memberName, withLabel = false }: { publicToken: string; memberName: string; withLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={withLabel ? btnSecondary : iconBtn}
        aria-label={`Show QR code for ${memberName}`}
        title="QR code"
        onClick={() => setOpen(true)}
      >
        <QrCode className="size-4" aria-hidden />
        {withLabel && "QR"}
      </button>
      {open && (
        <Modal title="Member QR Code" onClose={() => setOpen(false)}>
          <QrCard url={profileUrl(publicToken)} memberName={memberName} openLabel="Open Profile" />
        </Modal>
      )}
    </>
  );
}

type DeleteProps = { memberId: string; memberName: string; redirectTo?: string; withLabel?: boolean };

export function DeleteMemberButton({ memberId, memberName, redirectTo, withLabel = false }: DeleteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Unable to delete member. Please try again.");
        return setDeleting(false);
      }
      toast.success(res.ok ? "Member deleted successfully." : "This member was already deleted.");
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Network error. Check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={withLabel ? btnDanger : iconBtn}
        aria-label={`Delete ${memberName}`}
        title="Delete"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" aria-hidden />
        {withLabel && "Delete"}
      </button>
      {open && (
        <Modal title="Delete Member?" onClose={() => setOpen(false)}>
          <p className="text-sm text-neutral-600">Are you sure you want to permanently delete this member?</p>
          <p className="mt-2 text-sm text-neutral-600">
            <strong className="font-semibold text-neutral-900">{memberName}</strong>&apos;s public profile and QR code
            will stop working.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className={btnSecondary} disabled={deleting} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className={btnPrimary} disabled={deleting} onClick={remove}>
              {deleting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
