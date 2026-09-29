"use client";

import { LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Brand, iconBtn } from "./ui";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
];

export function AdminNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const links = (
    <nav aria-label="Admin" className="space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setMenuOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-red-500/25 focus-visible:outline-none ${
            isActive(href) ? "bg-red-600 text-white shadow-sm shadow-red-600/25" : "text-neutral-600 hover:bg-red-50 hover:text-red-700"
          }`}
        >
          <Icon className="size-5" aria-hidden /> {label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-neutral-500">{email}</p>
      </div>
      <button
        type="button"
        className={iconBtn}
        aria-label="Sign out"
        title="Sign out"
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
      >
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-neutral-200 bg-white px-4 py-6 lg:flex">
        <Link href="/admin" className="rounded-xl px-2 focus-visible:ring-4 focus-visible:ring-red-500/25 focus-visible:outline-none">
          <Brand />
        </Link>
        <p className="mt-2 px-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">Member CRM</p>
        <div className="mt-8 flex-1">{links}</div>
        {account}
      </aside>

      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/admin" aria-label="Dashboard">
            <Brand />
          </Link>
          <button
            type="button"
            className={iconBtn}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
        {menuOpen && (
          <div id="admin-mobile-nav" className="space-y-4 border-t border-neutral-100 px-4 py-4">
            {links}
            {account}
          </div>
        )}
      </header>
    </>
  );
}
