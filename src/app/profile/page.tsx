"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMastery } from "@/lib/userClient";
import type { MasteryEntry } from "@/lib/userClient";
import { MasteryChart } from "@/components/MasteryChart";

export default function ProfilePage() {
  const { isSignedIn, getToken, isLoaded } = useAuth();
  const [mastery, setMastery] = useState<MasteryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    const fetchData = !isSignedIn
      ? Promise.resolve(null)
      : getToken().then((token) => {
          if (!token) throw new Error("No auth token");
          return getMastery(token);
        });
    fetchData
      .then((data) => {
        if (data !== null) setMastery(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load mastery"))
      .finally(() => setLoading(false));
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return <div className="p-8 text-[#7c6f64]">Loading...</div>;
  }

  if (!isSignedIn) {
    return <div className="p-8 text-[#3c3836]">Please log in to view your profile.</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-[#3c3836]">Your Mastery</h1>
      {error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <MasteryChart data={mastery} />
      )}
    </div>
  );
}
