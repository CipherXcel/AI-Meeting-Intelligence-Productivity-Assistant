"use client";
import { useId } from "react";
import { Heart } from "lucide-react";
export function DiaryDayCover({
  date,
  favourite,
}: {
  date: string;
  favourite: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const month = Number(date.slice(5, 7)),
    day = Number(date.slice(8));
  const season =
    month >= 6 && month <= 9
      ? "monsoon"
      : month >= 3 && month <= 5
        ? "spring"
        : month >= 10 && month <= 11
          ? "autumn"
          : "winter";
  const dateValue = new Date(date + "T12:00:00");
  const monthLabel = dateValue
    .toLocaleDateString("en", { month: "short" })
    .toUpperCase();
  const weekday = dateValue.toLocaleDateString("en", { weekday: "short" });
  return (
    <span
      className={`diary-season-cover ${season} ${favourite ? "is-favourite" : ""}`}
    >
      <svg
        viewBox="0 0 320 180"
        aria-hidden="true"
        style={{
          filter: `hue-rotate(${(((day + month * 3) % 9) - 4) * 4}deg)`,
        }}
      >
        <defs>
          <linearGradient id={id} x2="0" y2="1">
            <stop stopColor="var(--season-sky)" />
            <stop offset="1" stopColor="var(--season-haze)" />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill={`url(#${id})`} />
        <circle
          cx="250"
          cy="45"
          r="24"
          fill="var(--season-sun)"
          opacity=".75"
        />
        <path
          d="M0 135Q70 75 160 140Q240 90 320 125V180H0Z"
          fill="var(--season-hill)"
          opacity=".45"
        />
        <path
          d="M0 160Q85 120 165 165Q250 120 320 150V180H0Z"
          fill="var(--season-hill)"
          opacity=".7"
        />
        {season === "monsoon" ? (
          <>
            <path
              d="M45 50c-14-25 28-39 38-19 15-16 39-4 34 13 25-4 31 24 10 26H50C25 70 26 51 45 50Z"
              fill="#edf4f3"
              opacity=".75"
            />
            {Array.from({ length: 16 }, (_, i) => (
              <path
                key={i}
                d={`M${25 + ((i * 37 + day) % 265)} ${83 + ((i * 17) % 54)}l-4 12`}
                stroke="#d7edee"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </>
        ) : season === "spring" ? (
          <>
            {Array.from({ length: 7 }, (_, i) => (
              <g
                key={i}
                transform={`translate(${25 + i * 43},${145 + (i % 2) * 15})`}
              >
                <path d="M0 22V0" stroke="#587f6c" />
                <circle cy="0" r="7" fill={i % 2 ? "#edb9b2" : "#f3d8a4"} />
                <circle cy="0" r="2" fill="#b78451" />
              </g>
            ))}
          </>
        ) : season === "autumn" ? (
          <>
            {Array.from({ length: 10 }, (_, i) => (
              <ellipse
                key={i}
                cx={25 + ((i * 47) % 280)}
                cy={55 + ((i * 29) % 100)}
                rx="4"
                ry="9"
                transform={`rotate(${i * 23} ${25 + ((i * 47) % 280)} ${55 + ((i * 29) % 100)})`}
                fill={i % 2 ? "#b97b48" : "#e7b574"}
                opacity=".7"
              />
            ))}
          </>
        ) : (
          <>
            {Array.from({ length: 17 }, (_, i) => (
              <circle
                key={i}
                cx={15 + ((i * 47) % 290)}
                cy={20 + ((i * 29) % 140)}
                r={i % 3 === 0 ? 2 : 1}
                fill="#fff"
                opacity=".7"
              />
            ))}
          </>
        )}
      </svg>
      <span className="season-day">
        {String(day).padStart(2, "0")}
        <small>{monthLabel}</small>
      </span>
      <span className="season-label">
        {weekday}
        <small>{dateValue.getFullYear()}</small>
      </span>
      {favourite && (
        <span className="season-favourite">
          <Heart size={12} fill="currentColor" /> Favourite
        </span>
      )}
    </span>
  );
}
