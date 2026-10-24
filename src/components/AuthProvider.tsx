"use client";
import type { ReactNode } from "react";
import { ClerkProvider, useAuth as useClerkAuth, SignIn, SignUp } from "@clerk/nextjs";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}

// Single hook all components use — never import from @clerk/nextjs directly
export function useAuth() {
  const { isSignedIn, getToken, userId, isLoaded } = useClerkAuth();
  return { isSignedIn, getToken, userId, isLoaded };
}

// Re-export auth UI components — never import from @clerk/nextjs directly
export { SignIn, SignUp };
