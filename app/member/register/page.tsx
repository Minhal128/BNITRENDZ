import type { Metadata } from "next";
import { MemberForm } from "@/components/member-form";
import { PublicShell } from "@/components/public-shell";
import { card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Member Registration",
  description: "Register as a BNITRENDZ member and get your profile link and QR code instantly.",
};

export default function RegisterPage() {
  return (
    <PublicShell
      title="Member Registration"
      intro="Fill in your details below. You'll get your personal profile link and QR code instantly."
    >
      <div className={`${card} p-5 sm:p-8`}>
        <MemberForm mode="register" />
      </div>
      <p className="mt-6 text-center text-xs text-neutral-500">
        Fields marked <span className="text-red-600">*</span> are required. Your profile is shared only through your
        personal link.
      </p>
    </PublicShell>
  );
}
