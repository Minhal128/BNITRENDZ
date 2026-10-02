import type { NextRequest } from "next/server";
import { denyUnlessAdmin } from "@/lib/auth";
import { toDateInput } from "@/lib/format";
import { memberSearchWhere } from "@/lib/members";
import { prisma } from "@/lib/prisma";
import { listQuerySchema } from "@/lib/validation";

/**
 * Starts a spreadsheet formula, so Excel would evaluate it on open (CSV injection).
 * "+91 98..." and "-" style phone numbers are excluded: the phone field already allows nothing but [\d\s().-].
 */
const FORMULA = /^[=@\t\r]|^[+-](?![\d\s().-]*$)/;

function cell(value: string | null) {
  const text = FORMULA.test(value ?? "") ? `'${value}` : (value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const SHEETS = {
  contacts: ["Name of member", "Company name", "Category", "Phone no.", "Email id"],
  dates: ["Name of member", "Bday", "Anniversary"],
};

/**
 * CSV download for the two member sheets, honouring the list's current search.
 * ponytail: Excel opens CSV natively, so no xlsx writer (or dependency) is needed.
 */
export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;

  const { search } = listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const sheet = req.nextUrl.searchParams.get("sheet") === "dates" ? "dates" : "contacts";
  const members = await prisma.member.findMany({
    where: memberSearchWhere(search),
    orderBy: [{ memberName: "asc" }, { id: "asc" }],
  });

  const rows = members.map((m) =>
    sheet === "dates"
      ? [m.memberName, toDateInput(m.birthday), toDateInput(m.anniversary)]
      : [m.memberName, m.companyName, m.businessCategory, m.phone, m.email],
  );

  // The BOM is what makes Excel read the file as UTF-8 instead of the system codepage.
  const csv = `﻿${[SHEETS[sheet], ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
  const fileName = `bnitrendz-${sheet === "dates" ? "special-dates" : "contacts"}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}
