"use client";
import type { MasteryEntry } from "@/lib/userClient";

interface Props {
  data: MasteryEntry[];
}

export function MasteryChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-[#7c6f64]">No Attempts yet. Submit some problems to see your mastery.</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.topic}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#3c3836] font-medium">{entry.topic}</span>
            <span className="text-[#7c6f64]">
              {Math.round(entry.clean_solve_rate * 100)}% clean · {entry.attempts_count} Attempts
            </span>
          </div>
          <div className="h-3 bg-[#ebdbb2] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#458588] rounded-full transition-all"
              style={{ width: `${Math.min(entry.clean_solve_rate * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
