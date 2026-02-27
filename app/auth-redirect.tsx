"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Mounted on the landing page.
 * Uses router.replace() so the "/" history entry is replaced with "/dashboard"
 * rather than pushed on top of it — pressing Back then returns to the previous
 * page (e.g. Google) instead of bouncing between "/" and "/dashboard".
 */
export function AuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  return null;
}
