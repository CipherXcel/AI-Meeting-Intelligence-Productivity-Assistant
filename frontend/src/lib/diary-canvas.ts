export type TextBox = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
  color: string;
};
export function strokeHit(
  points: [number, number][],
  x: number,
  y: number,
  radius = 18,
): boolean {
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[Math.max(0, i - 1)],
      dx = a[0] - b[0],
      dy = a[1] - b[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - b[0]) * dx + (y - b[1]) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    if (Math.hypot(x - b[0] - t * dx, y - b[1] - t * dy) <= radius) return true;
  }
  return false;
}
