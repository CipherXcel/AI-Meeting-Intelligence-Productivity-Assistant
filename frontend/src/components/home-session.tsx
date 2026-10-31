"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreSession } from "../lib/workspace";

export function HomeSession() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    restoreSession()
      .then((signedIn) => {
        if (active && signedIn) router.replace("/workspace/");
      })
      .catch(() => {
        // Public information remains available when the API is unavailable.
      });
    return () => {
      active = false;
    };
  }, [router]);
  return null;
}
