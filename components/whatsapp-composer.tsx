"use client";

import { CircleCheck, LoaderCircle, MessageCircle, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WhatsAppTemplate } from "@/lib/whatsapp";
import { Modal } from "./member-actions";
import { Skeleton, btnSecondary, inputCls } from "./ui";

type Recipients = { memberIds: string[]; all: boolean; search: string; count: number };
type SendResult = {
  sent: number;
  failed: number;
  skipped: number;
  results: { id: string; memberName: string; status: "sent" | "failed" | "skipped"; error?: string }[];
};

const firstValues = (t?: WhatsAppTemplate) => t?.variables.map((_, i) => (i === 0 ? "{name}" : "")) ?? [];
const btnWhatsApp =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60";

export function WhatsAppComposer({ recipients, onClose }: { recipients: Recipients; onClose: () => void }) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>();
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<"template" | "text">("template");
  const [templateIndex, setTemplateIndex] = useState(0);
  const [values, setValues] = useState<string[]>([]);
  const [text, setText] = useState("Hello {name}, ");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult>();

  useEffect(() => {
    fetch("/api/whatsapp/templates")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Couldn't load WhatsApp templates.");
        if (!data.configured) throw new Error("WhatsApp isn't configured on the server yet.");
        setTemplates(data.templates);
        setValues(firstValues(data.templates[0]));
        if (!data.templates.length) setMode("text");
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const template = templates?.[templateIndex];
  const canSend = mode === "text" ? text.trim().length > 0 : !!template && values.every((v) => v.trim());
  const preview = template?.body.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    (values[template.variables.indexOf(key)] || match).replaceAll("{name}", "Ayesha"),
  );

  async function send() {
    if (sending || !canSend) return;
    const message =
      mode === "text"
        ? { type: "text", text }
        : {
            type: "template",
            name: template!.name,
            language: template!.language,
            parameters: template!.variables.map((v, i) => ({ ...(template!.named && { name: v }), value: values[i] })),
          };
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: recipients.all ? [] : recipients.memberIds,
          all: recipients.all,
          search: recipients.search,
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldError = Object.values((data.fieldErrors ?? {}) as Record<string, string[]>).flat()[0];
        toast.error(fieldError ?? data.error ?? "Unable to send WhatsApp messages.");
        return;
      }
      setResult(data);
      if (data.sent) toast.success(`WhatsApp message sent to ${data.sent} ${data.sent === 1 ? "member" : "members"}.`);
      else toast.error("No WhatsApp messages were sent.");
    } catch {
      toast.error("Network error. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    const problems = result.results.filter((r) => r.status !== "sent");
    return (
      <Modal title="WhatsApp results" onClose={onClose} wide>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Sent", value: result.sent, cls: "bg-emerald-50 text-emerald-700" },
            { label: "Failed", value: result.failed, cls: "bg-red-50 text-red-700" },
            { label: "Skipped", value: result.skipped, cls: "bg-neutral-100 text-neutral-700" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-3 py-3 ${s.cls}`}>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs font-semibold tracking-wide uppercase">{s.label}</p>
            </div>
          ))}
        </div>
        {problems.length > 0 && (
          <ul className="mt-4 max-h-56 divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200 text-sm">
            {problems.map((r) => (
              <li key={r.id} className="flex gap-3 px-3 py-2">
                <TriangleAlert className={`mt-0.5 size-4 shrink-0 ${r.status === "failed" ? "text-red-600" : "text-neutral-400"}`} aria-hidden />
                <span className="min-w-0">
                  <span className="font-medium">{r.memberName}</span>
                  <span className="block break-words text-neutral-500">{r.error}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {result.sent > 0 && (
          <p className="mt-4 flex items-start gap-2 text-sm text-neutral-600">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
            Accepted by WhatsApp. Delivery can take a moment.
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Send WhatsApp message" onClose={onClose} wide>
      <p className="text-sm text-neutral-600">
        To <strong className="text-neutral-900">{recipients.count}</strong>{" "}
        {recipients.all ? (recipients.search ? `members matching “${recipients.search}”` : "members (everyone)") : recipients.count === 1 ? "selected member" : "selected members"}.
        Members without a valid phone number are skipped.
      </p>

      {loadError ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </p>
      ) : !templates ? (
        <div className="mt-5 space-y-3" role="status" aria-label="Loading WhatsApp templates">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
            {(["template", "text"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-red-500/25 focus-visible:outline-none ${
                  mode === m ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {m === "template" ? "Approved template" : "Custom message"}
              </button>
            ))}
          </div>

          {mode === "template" ? (
            templates.length === 0 ? (
              <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                No approved templates yet. Create one in WhatsApp Manager, or send a custom message.
              </p>
            ) : (
              <>
                <div>
                  <label htmlFor="wa-template" className="mb-1.5 block text-sm font-medium text-neutral-800">
                    Template
                  </label>
                  <select
                    id="wa-template"
                    value={templateIndex}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      setTemplateIndex(i);
                      setValues(firstValues(templates[i]));
                    }}
                    className={inputCls}
                  >
                    {templates.map((t, i) => (
                      <option key={`${t.name}|${t.language}`} value={i}>
                        {t.name} ({t.language})
                      </option>
                    ))}
                  </select>
                </div>
                {template!.variables.map((v, i) => (
                  <div key={v}>
                    <label htmlFor={`wa-var-${i}`} className="mb-1.5 block text-sm font-medium text-neutral-800">
                      Variable {`{{${v}}}`}
                    </label>
                    <input
                      id={`wa-var-${i}`}
                      value={values[i] ?? ""}
                      maxLength={1000}
                      onChange={(e) => setValues((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                      className={inputCls}
                    />
                  </div>
                ))}
                {template!.variables.length > 0 && (
                  <p className="text-xs text-neutral-500">
                    Type <code className="rounded bg-neutral-100 px-1">{"{name}"}</code> to insert each member&apos;s name.
                  </p>
                )}
                <div className="rounded-xl rounded-tl-sm bg-emerald-50 px-4 py-3 text-sm text-neutral-800">
                  <p className="mb-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase">Preview</p>
                  {template!.header && <p className="font-semibold">{template!.header}</p>}
                  <p className="whitespace-pre-wrap">{preview}</p>
                  {template!.footer && <p className="mt-1 text-xs text-neutral-500">{template!.footer}</p>}
                </div>
              </>
            )
          ) : (
            <div>
              <label htmlFor="wa-text" className="mb-1.5 block text-sm font-medium text-neutral-800">
                Message
              </label>
              <textarea
                id="wa-text"
                rows={5}
                maxLength={4096}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                <code className="rounded bg-neutral-100 px-1">{"{name}"}</code> becomes each member&apos;s name.
              </p>
              <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                WhatsApp only delivers custom messages to members who messaged your business number in the last 24
                hours. To reach everyone, use an approved template.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={btnSecondary} onClick={onClose} disabled={sending}>
          Cancel
        </button>
        <button type="button" className={btnWhatsApp} onClick={send} disabled={!canSend || sending || !!loadError || !templates}>
          {sending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <MessageCircle className="size-4" aria-hidden />}
          {sending ? "Sending…" : `Send to ${recipients.count}`}
        </button>
      </div>
    </Modal>
  );
}
