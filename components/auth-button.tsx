"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";

export function AuthButton() {
  const pathname = usePathname();
  const [user, setUser] = useState<Awaited<ReturnType<typeof getMe>> | null>(
    null,
  );

  useEffect(() => {
    const supabase = createClient();
    let controller: AbortController | undefined;

    async function loadProfile() {
      controller?.abort();
      const request = new AbortController();
      controller = request;

      try {
        const profile = await getMe(request.signal);
        if (!request.signal.aborted) setUser(profile);
      } catch {
        if (!request.signal.aborted) setUser(null);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        controller?.abort();
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void loadProfile();
      }
    });

    void loadProfile();
    return () => {
      subscription.unsubscribe();
      controller?.abort();
    };
  }, [pathname]);

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.first_name?.trim() || "there"}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
