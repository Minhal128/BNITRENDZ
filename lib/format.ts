// On Vercel, fall back to the project's production domain (a system variable inlined at build time).
const vercelDomain = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3000")
).replace(/\/+$/, "");

/** The only thing a member QR code ever contains. */
export const profileUrl = (publicToken: string) => `${APP_URL}/member/${publicToken}`;

/** A new photo gets a new URL (?v=), so the photo route can let browsers cache it forever. */
export const photoUrl = (member: { publicToken: string; photoUpdatedAt: Date | null }) =>
  member.photoUpdatedAt ? `/api/members/public/${member.publicToken}/photo?v=${member.photoUpdatedAt.getTime()}` : null;

export function qrFileName(memberName: string) {
  const slug = memberName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `member-${slug || "profile"}-qr.png`;
}

const SOCIAL_BASE = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  youtube: "https://www.youtube.com/@",
};

/** Links are validated on write; prefixing anything unexpected with https:// keeps render-time output harmless too. */
export const websiteHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

export const socialHref = (kind: keyof typeof SOCIAL_BASE, value: string) =>
  /^https?:\/\//i.test(value) ? value : SOCIAL_BASE[kind] + encodeURIComponent(value);

export const socialLabel = (value: string) => (/^https?:\/\//i.test(value) ? displayUrl(value) : `@${value}`);

export const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/** Calendar dates (birthday, anniversary) are stored at UTC midnight, so they are always shown in UTC. */
export const formatDate = (date: Date, timeZone = "UTC") =>
  date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone });

export const toDateInput = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";
