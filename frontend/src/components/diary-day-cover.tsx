"use client";
import { Sun, Flower2, Cloud, Moon, CloudRain } from "lucide-react";
import type { CSSProperties } from "react";
const names = [
  "Botanical",
  "Rainy window",
  "Golden hour",
  "Moon garden",
  "Watercolour",
  "Paper collage",
  "Ocean",
  "Blossom",
];
export function DiaryDayCover({
  date,
  favourite,
  mood,
}: {
  date: string;
  favourite: boolean;
  mood?: string | null;
}) {
  const month = Number(date.slice(5, 7)),
    day = Number(date.slice(8)),
    year = Number(date.slice(0, 4));
  const variant = (day + month * 3 + year) % 8;
  const feeling = (
    {
      radiant: { Icon: Sun, label: "Radiant", tone: "sun" },
      good: { Icon: Flower2, label: "Good", tone: "flower" },
      okay: { Icon: Cloud, label: "Okay", tone: "cloud" },
      low: { Icon: Moon, label: "Low", tone: "moon" },
      heavy: { Icon: CloudRain, label: "Heavy", tone: "rain" },
    } as const
  )[mood as "radiant" | "good" | "okay" | "low" | "heavy"];
  const value = new Date(date + "T12:00:00");
  return (
    <span
      className={`diary-art-cover cover-${variant} ${favourite ? "cover-favourite" : ""}`}
      title={`${names[variant]} · ${date}`}
      style={
        {
          "--cover-x": `${(variant % 2) * 100}%`,
          "--cover-y": `${(Math.floor(variant / 2) * 100) / 3}%`,
          "--day-hue": `${(((day + month) % 5) - 2) * 3}deg`,
        } as CSSProperties
      }
    >
      <span className="cover-art" aria-hidden="true" />
      <span className="cover-tint" aria-hidden="true" />
      <span className="cover-shine" aria-hidden="true" />
      <span className="cover-date">
        <b>{String(day).padStart(2, "0")}</b>
        <span>
          {value.toLocaleDateString("en", { month: "short" }).toUpperCase()}
        </span>
      </span>
      <span className="cover-weekday">
        {value.toLocaleDateString("en", { weekday: "short" })}
        <small>{year}</small>
      </span>
      {feeling && (
        <span
          className={`cover-feeling feeling-${feeling.tone}`}
          title={`Feeling ${feeling.label.toLowerCase()}`}
        >
          <feeling.Icon aria-hidden="true" />
          <small>{feeling.label}</small>
        </span>
      )}
      {favourite && <span className="cover-bookmark" aria-label="Favourite" />}
    </span>
  );
}
