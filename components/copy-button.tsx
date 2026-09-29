"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { btnSecondary } from "./ui";

export async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied successfully.");
  } catch {
    toast.error("Couldn't copy the link. Please copy it manually.");
  }
}

export function CopyButton({ url, className = btnSecondary }: { url: string; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => copyLink(url)}>
      <Copy className="size-4" aria-hidden /> Copy Link
    </button>
  );
}
