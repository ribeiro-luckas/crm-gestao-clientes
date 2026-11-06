import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...values: ClassValue[]) {

  return twMerge(clsx(values));

}

export function formatCurrency(value: string | number, currency = "BRL") {

  const numeric = typeof value === "number" ? value : Number(value);

  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(numeric);

}

export function formatDate(value: Date | string, options: Intl.DateTimeFormatOptions = {}) {

  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", ...options }).format(date);

}

export function formatDateTime(value: Date | string) {

  return formatDate(value, { dateStyle: "short", timeStyle: "short" });

}

export function initials(name: string) {

  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

}

export function recifeDateTimeToIso(value: string) {

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) return "";

  const [, year, month, day, hour, minute] = match;
  const wallClockAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(wallClockAsUtc));
  const part = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  const renderedAsUtc = Date.UTC(Number(part.year), Number(part.month) - 1, Number(part.day), Number(part.hour), Number(part.minute));
  const timezoneOffset = renderedAsUtc - wallClockAsUtc;
  
  return new Date(wallClockAsUtc - timezoneOffset).toISOString();
}
