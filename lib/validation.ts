import { z } from "zod";

const HANDLE = /^@?[\w.-]{1,100}$/;

/** Normalises user input to an http(s) URL; anything else (javascript:, data:, vbscript:, …) yields null. */
export function toHttpUrl(value: string): string | null {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

/** A real calendar date (YYYY-MM-DD) between 1900 and today (+1 day of timezone slack). */
function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().startsWith(value) &&
    value >= "1900-01-01" &&
    date.getTime() <= Date.now() + 86_400_000
  );
}

// Trims and collapses runs of whitespace before any other check.
const text = (max: number) =>
  z
    .string()
    .overwrite((v) => v.replace(/\s+/g, " ").trim())
    .max(max, `Must be ${max} characters or fewer.`);
const optionalText = (max: number) => text(max).transform((v) => v || null);

const phone = text(30)
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return !v || (/^\+?[\d\s().-]+$/.test(v) && digits >= 6 && digits <= 15);
  }, "Enter a valid phone number.")
  .transform((v) => v || null);

const email = text(254)
  .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address.")
  .transform((v) => v || null);

const date = text(10)
  .refine((v) => !v || isValidDate(v), "Enter a valid date that is not in the future.")
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null));

const website = text(300).transform((v, ctx) => {
  if (!v) return null;
  const url = toHttpUrl(v);
  if (!url) ctx.addIssue({ code: "custom", message: "Enter a valid website, e.g. https://example.com." });
  return url;
});

// Social fields accept a handle (stored without "@") or a full http(s) link.
const social = text(200).transform((v, ctx) => {
  if (!v) return null;
  if (HANDLE.test(v)) return v.replace(/^@/, "");
  const url = toHttpUrl(v);
  if (!url) ctx.addIssue({ code: "custom", message: "Enter a handle like @name or a full https:// link." });
  return url;
});

export const memberSchema = z.object({
  memberName: text(100).min(1, "Member name is required."),
  companyName: optionalText(120).nullish(),
  phone: phone.nullish(),
  address: optionalText(300).nullish(),
  birthday: date.nullish(),
  anniversary: date.nullish(),
  website: website.nullish(),
  instagram: social.nullish(),
  email: email.nullish(),
  facebook: social.nullish(),
  youtube: social.nullish(),
});

export const memberUpdateSchema = memberSchema.partial();

export type MemberFormValues = Record<keyof z.input<typeof memberSchema>, string>;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
  search: z.string().trim().max(100).catch(""),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).catch("newest"),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export const invalidResponse = (error: z.ZodError) =>
  Response.json(
    { error: "Please correct the highlighted fields.", fieldErrors: z.flattenError(error).fieldErrors },
    { status: 400 },
  );
