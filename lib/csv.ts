/**
 * CSV export helpers.
 * UTF-8 BOM prefix ensures Excel on Windows renders Chinese characters correctly.
 */

const BOM = "﻿";

function escapeField(value: unknown): string {
  const str =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? value.join("|")
        : String(value);

  // Quote fields that contain commas, double-quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return BOM;

  const headers = Object.keys(data[0]);
  const headerRow = headers.map(escapeField).join(",");
  const rows = data.map((row) =>
    headers.map((h) => escapeField(row[h])).join(",")
  );

  return BOM + [headerRow, ...rows].join("\n");
}
