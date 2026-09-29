"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { btnPrimary, inputCls } from "./ui";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (res?.ok && !res.error) {
        router.replace(callbackUrl);
        router.refresh();
        return;
      }
      setError(res?.error && res.error !== "CredentialsSignin" ? res.error : "Invalid email or password.");
    } catch {
      setError("Network error. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-800">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={inputCls} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-800">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full py-3 text-base`}>
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {pending ? "Signing in…" : "Login"}
      </button>
    </form>
  );
}
