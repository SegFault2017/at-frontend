"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMastery } from "@/lib/userClient";
import type { MasteryEntry } from "@/lib/userClient";
import { MasteryChart } from "@/components/MasteryChart";

export default function ProfilePage() {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const [mastery, setMastery] = useState<MasteryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    setLoading(true);
    getToken()
      .then((token) => {
        if (!token) throw new Error("No auth token");
        return getMastery(token);
      })
      .then(setMastery)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load mastery"))
      .finally(() => setLoading(false));
    // getToken is a Clerk utility — not a reactive value, excluded from deps intentionally
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return <div className="p-8 text-gruvbox-gray">Loading...</div>;
  }

  if (!isSignedIn) {
    return <div className="p-8 text-gruvbox-fg">Please log in to view your profile.</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-gruvbox-fg">Your Mastery</h1>
      {error ? (
        <p className="text-gruvbox-red text-sm">{error}</p>
      ) : (
        <MasteryChart data={mastery} />
      )}
    </div>
  );
}
