const dayFormatters = new Map<string, Intl.DateTimeFormat>();
export function dayKey(value: string | number | Date, timezone: string) {
  let formatter = dayFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function shiftDay(day: string, amount: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function weekDays(day: string) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  const monday = shiftDay(day, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}
export function overlapsDay(
  start: string,
  end: string | undefined,
  day: string,
  timezone: string,
) {
  const startDay = /^\d{4}-\d{2}-\d{2}$/.test(start)
    ? start
    : dayKey(start, timezone);
  // All-day calendar end dates are exclusive, as are midnight timed-event ends.
  const lastDay = end
    ? /^\d{4}-\d{2}-\d{2}$/.test(end)
      ? shiftDay(end, -1)
      : dayKey(Math.max(Date.parse(start), Date.parse(end) - 1), timezone)
    : startDay;
  return startDay <= day && lastDay >= day;
}
export function elapsedSeconds(
  start: string,
  end: string | number = Date.now(),
) {
  return Math.max(
    0,
    Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000),
  );
}
export function durationLabel(seconds: number) {
  if (seconds < 60) return `${Math.floor(seconds)} sec`;
  const minutes = Math.floor(seconds / 60),
    hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes} min`;
}
export function clockLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor(seconds / 60) % 60;
  return [
    ...(hours ? [String(hours).padStart(2, "0")] : []),
    String(minutes).padStart(2, "0"),
    String(seconds % 60).padStart(2, "0"),
  ].join(":");
}
