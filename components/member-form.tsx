"use client";

import { CircleCheck, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { profileUrl } from "@/lib/format";
import { memberSchema, type MemberFormValues } from "@/lib/validation";
import { QrCard } from "./qr-card";
import { btnPrimary, btnSecondary, inputCls } from "./ui";

type FieldName = keyof MemberFormValues;
type Field = { name: FieldName; label: string; type?: string; placeholder?: string; autoComplete?: string };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Member Info",
    fields: [
      { name: "memberName", label: "Member Name", autoComplete: "name", placeholder: "e.g. Ayesha Khan" },
      { name: "companyName", label: "Company Name", autoComplete: "organization", placeholder: "e.g. BNI Trendz" },
      { name: "businessCategory", label: "Business Category", placeholder: "e.g. Interior Design" },
      { name: "phone", label: "Phone Number", type: "tel", autoComplete: "tel", placeholder: "+91 9876543210" },
      { name: "address", label: "Address", autoComplete: "street-address", placeholder: "Street, area, city" },
    ],
  },
  {
    title: "Special Dates",
    fields: [
      { name: "birthday", label: "Birthday", type: "date" },
      { name: "anniversary", label: "Anniversary", type: "date" },
    ],
  },
  {
    title: "Online Presence",
    fields: [
      { name: "website", label: "Website", type: "url", autoComplete: "url", placeholder: "https://example.com" },
      { name: "instagram", label: "Instagram Handle", placeholder: "@yourhandle" },
      { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "name@example.com" },
      { name: "facebook", label: "Facebook ID", placeholder: "your.profile or profile link" },
      { name: "youtube", label: "YouTube Channel", placeholder: "@channel or channel link" },
    ],
  },
];

const EMPTY = Object.fromEntries(SECTIONS.flatMap((s) => s.fields).map((f) => [f.name, ""])) as MemberFormValues;

type Props =
  | { mode: "register" | "create"; memberId?: never; initialValues?: never }
  | { mode: "edit"; memberId: string; initialValues: MemberFormValues };

type Errors = Partial<Record<FieldName, string>>;
const firstErrors = (fieldErrors: Partial<Record<string, string[]>>): Errors =>
  Object.fromEntries(Object.entries(fieldErrors).map(([name, messages]) => [name, messages?.[0]]));

export function MemberForm({ mode, memberId, initialValues }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<MemberFormValues>(initialValues ?? EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState<{ publicToken: string; memberName: string }>();
  const inFlight = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return; // blocks a double click even before the disabled state renders

    const parsed = memberSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = firstErrors(z.flattenError(parsed.error).fieldErrors);
      setErrors(fieldErrors);
      document.getElementById(Object.keys(fieldErrors)[0] ?? "")?.focus();
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    const unlock = () => {
      inFlight.current = false;
      setSubmitting(false);
    };

    try {
      const res = await fetch(mode === "edit" ? `/api/members/${memberId}` : "/api/members", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fieldErrors) setErrors(firstErrors(data.fieldErrors));
        toast.error(data.error ?? "Unable to save member. Please try again.");
        return unlock();
      }
      if (mode === "register") return setRegistered(data.member);
      // Admin flows stay locked until the navigation replaces this form.
      toast.success(mode === "edit" ? "Member updated successfully." : "Member created successfully.");
      router.push(`/admin/members/${data.member.id}`);
      router.refresh();
    } catch {
      toast.error("Network error. Check your connection and try again.");
      unlock();
    }
  }

  if (registered) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CircleCheck className="size-8" aria-hidden />
        </div>
        <h2 ref={(el) => el?.focus()} tabIndex={-1} className="mt-4 text-2xl font-bold tracking-tight focus:outline-none">
          Registration Successful!
        </h2>
        <p className="mt-1 text-neutral-600">Your member profile has been created.</p>
        <div className="mx-auto mt-7 max-w-sm">
          <QrCard url={profileUrl(registered.publicToken)} memberName={registered.memberName} label="Your Member Profile" share />
        </div>
      </div>
    );
  }

  const submitLabel = { register: "Submit Registration", create: "Create Member", edit: "Save Changes" }[mode];

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-8">
      {SECTIONS.map((section) => (
        <fieldset key={section.title}>
          <legend className="mb-4 text-xs font-bold tracking-widest text-red-600 uppercase">{section.title}</legend>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const error = errors[field.name];
              const required = field.name === "memberName";
              const props = {
                id: field.name,
                name: field.name,
                value: values[field.name],
                placeholder: field.placeholder,
                autoComplete: field.autoComplete,
                required,
                "aria-invalid": error ? true : undefined,
                "aria-describedby": error ? `${field.name}-error` : undefined,
                className: inputCls,
                onChange: (e: { target: { value: string } }) => {
                  setValues((v) => ({ ...v, [field.name]: e.target.value }));
                  if (error) setErrors((prev) => ({ ...prev, [field.name]: undefined }));
                },
              };
              return (
                <div key={field.name} className={field.name === "address" ? "sm:col-span-2" : undefined}>
                  <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-neutral-800">
                    {field.label}
                    {required && (
                      <span className="text-red-600" aria-hidden>
                        {" "}
                        *
                      </span>
                    )}
                  </label>
                  {field.name === "address" ? (
                    <textarea rows={2} {...props} />
                  ) : (
                    <input type={field.type ?? "text"} {...props} />
                  )}
                  {error && (
                    <p id={`${field.name}-error`} className="mt-1.5 text-sm font-medium text-red-700">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:justify-end">
        {mode !== "register" && (
          <Link href={mode === "edit" ? `/admin/members/${memberId}` : "/admin/members"} className={btnSecondary}>
            Cancel
          </Link>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`${btnPrimary} ${mode === "register" ? "w-full py-3 text-base" : ""}`}
        >
          {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {submitting ? (mode === "register" ? "Submitting…" : "Saving…") : submitLabel}
        </button>
      </div>
    </form>
  );
}
