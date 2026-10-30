"use client";

import { useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
// Cell shade by problems solved that day: 0, 1, 2, 3, 4+
const SHADES = ["bg-neutral-900", "bg-emerald-900", "bg-emerald-700", "bg-emerald-500", "bg-emerald-400"];

/** Local YYYY-MM-DD, the key `solvedByDay` is expected to use. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** A month grid shaded by how many problems were solved each day, with month paging. */
export default function ActivityCalendar({ solvedByDay }: { solvedByDay: Map<string, number> }) {
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1));
  const solvedThisMonth = days.reduce((n, d) => n + (solvedByDay.get(dayKey(d)) ?? 0), 0);
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1));

  return (
    <div className="text-center">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Activity</h2>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="px-2 text-neutral-400 hover:text-white">‹</button>
        <div>
          <div className="font-semibold">{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
          <div className="text-xs text-neutral-400">{solvedThisMonth} solved this month</div>
        </div>
        <button onClick={() => shift(1)} aria-label="Next month" className="px-2 text-neutral-400 hover:text-white">›</button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-xs">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="py-1 text-neutral-500">{w}</div>
        ))}
        {/* Blank cells push day 1 under its weekday */}
        {Array.from({ length: month.getDay() }, (_, i) => <div key={`pad${i}`} />)}
        {days.map((d) => {
          const key = dayKey(d);
          const solved = solvedByDay.get(key) ?? 0;
          return (
            <div
              key={key}
              title={`${solved} solved`}
              className={`flex aspect-square items-center justify-center ${SHADES[Math.min(solved, 4)]} ${
                key === dayKey(today) ? "ring-2 ring-cyan-400" : ""
              }`}
            >
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-neutral-500">
        Less {SHADES.map((s) => <span key={s} className={`h-2.5 w-2.5 ${s}`} />)} More
      </div>
    </div>
  );
}
