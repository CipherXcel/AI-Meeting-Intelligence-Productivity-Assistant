import type { TextBox } from "./diary-canvas";
export type Stroke = {
  color: string;
  width: number;
  points: [number, number][];
};
export type JournalEntry = {
  id: string;
  date: string;
  title: string;
  body: string;
  createdAt?: string;
  drawing?: Stroke[];
  textBoxes?: TextBox[];
  stickers?: { id: string; kind: string; x: number; y: number; size: number }[];
};
export type BookPage = {
  entry: JournalEntry;
  text: string;
  art: boolean;
  number: number;
  total: number;
};
export function dailyPages<T extends JournalEntry>(entries: T[]) {
  return [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.createdAt || a.id).localeCompare(b.createdAt || b.id),
  );
}
export function bookPages(entries: JournalEntry[]): BookPage[] {
  const pages: BookPage[] = [];
  for (const entry of dailyPages(entries)) {
    if (
      entry.drawing?.length ||
      entry.textBoxes?.length ||
      entry.stickers?.length
    ) {
      pages.push({ entry, text: entry.body, art: true, number: 0, total: 0 });
      continue;
    }
    let remaining = Array.from(entry.body);
    if (!remaining.length)
      pages.push({ entry, text: "", art: false, number: 0, total: 0 });
    while (remaining.length) {
      let count = Math.min(650, remaining.length);
      if (count < remaining.length) {
        const chunk = remaining.slice(0, count).join("");
        const boundary = Math.max(
          chunk.lastIndexOf("\n"),
          chunk.lastIndexOf(" "),
        );
        if (boundary > 325)
          count = Array.from(chunk.slice(0, boundary + 1)).length;
      }
      pages.push({
        entry,
        text: remaining.splice(0, count).join(""),
        art: false,
        number: 0,
        total: 0,
      });
    }
  }
  const totals = new Map<string, number>(),
    numbers = new Map<string, number>();
  for (const p of pages)
    totals.set(p.entry.date, (totals.get(p.entry.date) || 0) + 1);
  for (const p of pages) {
    p.number = (numbers.get(p.entry.date) || 0) + 1;
    numbers.set(p.entry.date, p.number);
    p.total = totals.get(p.entry.date)!;
  }
  return pages;
}
