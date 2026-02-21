"use client";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/nextjs";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}

// Single hook all components use — never import from @clerk/nextjs directly
export function useAuth() {
  const { isSignedIn, getToken, userId, isLoaded } = useClerkAuth();
  return { isSignedIn, getToken, userId, isLoaded };
}
