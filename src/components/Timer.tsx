"use client";
import { useEffect, useState } from "react";

interface Props {
  seconds: number;
  onExpire: () => void;
}

export function Timer({ seconds, onExpire }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining <= 60;

  return (
    <div className={`font-mono text-lg font-bold ${isWarning ? "text-red-500" : "text-[#ebdbb2]"}`}>
      {mins}:{secs.toString().padStart(2, "0")}
    </div>
  );
}
