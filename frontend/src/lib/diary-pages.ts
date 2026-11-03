import type { DiaryImage } from "./diary-images";
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
  position?: number;
  drawing?: Stroke[];
  images?: DiaryImage[];
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
      pagePosition(a) - pagePosition(b) ||
      (a.createdAt || a.id).localeCompare(b.createdAt || b.id),
  );
}
export function bookPages(entries: JournalEntry[]): BookPage[] {
  const pages: BookPage[] = [];
  for (const entry of dailyPages(entries)) {
    if (
      entry.images?.length ||
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

// A date is one notebook. Existing entries remain intact as pages inside it.
export function diaryDays<T extends JournalEntry & { favourite?: boolean }>(
  entries: T[],
) {
  const groups = new Map<string, T[]>();
  for (const page of dailyPages(entries)) {
    const pages = groups.get(page.date) || [];
    pages.push(page);
    groups.set(page.date, pages);
  }
  return [...groups]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, pages]) => ({
      date,
      pages,
      title: pages[0].title || "A day in my life",
      favourite: pages.some((page) => page.favourite),
    }));
}

export function bookLayout(
  viewWidth: number,
  viewHeight: number,
  expanded: boolean,
) {
  const available = Math.max(
    100,
    Math.min(viewWidth - (expanded ? 24 : 64), expanded ? 1400 : 1100),
  );
  const spread = available >= 700;
  const width = Math.floor(
    Math.max(
      64,
      Math.min(
        expanded ? 680 : 600,
        available / (spread ? 2 : 1),
        (viewHeight - (expanded ? 128 : 180)) / 1.34,
      ),
    ),
  );
  return { width, height: Math.round(width * 1.34), spread };
}

function pagePosition(page: JournalEntry) {
  return page.position ?? (Date.parse(page.createdAt || "") || 0);
}
export function nextPagePosition(pages: JournalEntry[], afterId?: string) {
  const ordered = dailyPages(pages);
  const i = afterId
    ? ordered.findIndex((p) => p.id === afterId)
    : ordered.length - 1;
  if (i < 0) return Date.now();
  const current = pagePosition(ordered[i]),
    next = ordered[i + 1];
  return next ? current + (pagePosition(next) - current) / 2 : current + 1000;
}
