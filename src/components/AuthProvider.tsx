"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  SignIn,
  SignUp,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}

// Single hook all components use — never import from @clerk/nextjs directly
export function useAuth() {
  const { isSignedIn, getToken, userId, isLoaded } = useClerkAuth();
  return { isSignedIn, getToken, userId, isLoaded };
}

/** The right side of a page header. Signed in, it shows account links and Clerk's UserButton; signed out, a sign-in link. */
export function HeaderAuth() {
  return (
    <div className="ml-auto flex items-center gap-4 text-sm">
      <SignedIn>
        <Link href="/problemset" className="text-gruvbox-fg hover:text-gruvbox-orange">Problem sets</Link>
        <Link href="/profile" className="text-gruvbox-fg hover:text-gruvbox-orange">Mastery</Link>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <Link href="/login" className="font-medium text-gruvbox-orange hover:opacity-90">Sign in</Link>
      </SignedOut>
    </div>
  );
}

// Re-export auth UI components — never import from @clerk/nextjs directly
export { SignIn, SignUp };
