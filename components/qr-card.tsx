"use client";

import { Download, ExternalLink, Share2 } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { qrFileName } from "@/lib/format";
import { CopyButton, copyLink } from "./copy-button";
import { Skeleton, btnPrimary, btnSecondary } from "./ui";

type Props = {
  url: string;
  memberName: string;
  label?: string;
  share?: boolean;
  openLabel?: string;
};

/** Built synchronously so navigator.share() still runs inside the click's user activation (Safari requires it). */
function pngFile(dataUrl: string, name: string) {
  const bytes = Uint8Array.from(atob(dataUrl.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
  return new File([bytes], name, { type: "image/png" });
}

export function QrCard({ url, memberName, label = "Public Profile URL", share = false, openLabel }: Props) {
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#171717", light: "#ffffff" } })
      .then((png) => active && setDataUrl(png))
      .catch(() => toast.error("Couldn't generate the QR code."));
    return () => {
      active = false;
    };
  }, [url]);

  async function shareQr() {
    if (!("share" in navigator)) return copyLink(url);
    const file = dataUrl ? pngFile(dataUrl, qrFileName(memberName)) : null;
    // Share the QR image itself where the browser can (phones, Chrome/Edge); otherwise share the link.
    const data: ShareData =
      file && navigator.canShare?.({ files: [file] })
        ? { files: [file], title: "Member Profile", text: `${memberName} · Member Profile\n${url}` }
        : { title: "Member Profile", text: `${memberName} · Member Profile`, url };
    try {
      await navigator.share(data);
    } catch (error) {
      if ((error as Error).name !== "AbortError") await copyLink(url);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="rounded-3xl bg-gradient-to-br from-red-500 to-red-700 p-1.5 shadow-lg shadow-red-600/20">
        <div className="rounded-[1.2rem] bg-white p-2">
          {dataUrl ? (
            <Image
              src={dataUrl}
              alt={`QR code linking to ${memberName}'s member profile`}
              width={208}
              height={208}
              unoptimized
              className="size-52"
            />
          ) : (
            <Skeleton className="size-52" />
          )}
        </div>
      </div>

      <div className="w-full text-center">
        <p className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">{label}</p>
        <p className="mt-1.5 rounded-xl bg-neutral-50 px-3 py-2 font-mono text-[13px] break-all text-neutral-800 select-all">
          {url}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <CopyButton url={url} />
        {share && (
          <button type="button" className={btnSecondary} onClick={shareQr}>
            <Share2 className="size-4" aria-hidden /> Share
          </button>
        )}
        {dataUrl ? (
          <a
            href={dataUrl}
            download={qrFileName(memberName)}
            className={btnPrimary}
            onClick={() => toast.success("QR downloaded.")}
          >
            <Download className="size-4" aria-hidden /> Download QR
          </a>
        ) : (
          <button type="button" className={btnPrimary} disabled>
            <Download className="size-4" aria-hidden /> Download QR
          </button>
        )}
        {openLabel && (
          <a href={url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            <ExternalLink className="size-4" aria-hidden /> {openLabel}
          </a>
        )}
      </div>
    </div>
  );
}
