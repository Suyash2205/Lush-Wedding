import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return raw;
}

export function extractFirstPhone(text: string): string | null {
  const match = text.match(/(\+?\d[\d\s\-().]{8,16}\d)/);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

export function truncate(str: string, max = 120): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}
