"use client";

import { cn } from "@/lib/utils";
import { postSignup } from "@/lib/api/auth";
import { parseSignupInput } from "@/lib/auth/validation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const signup = parseSignupInput({
    first_name: firstName,
    last_name: lastName,
    email,
    password,
  });
  const passwordsMatch = password === repeatPassword;
  const canSubmit = signup.ok && passwordsMatch && !isLoading;

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || !signup.ok || !passwordsMatch) return;
    setError(null);

    setIsLoading(true);
    try {
      const { requiresEmailConfirmation } = await postSignup(signup.input);
      router.push(
        requiresEmailConfirmation ? "/auth/sign-up-success" : "/dashboard",
      );
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <fieldset disabled={isLoading} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  aria-describedby="signup-password-hint"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p
                  id="signup-password-hint"
                  className="text-sm text-muted-foreground"
                >
                  Use at least 6 characters.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Confirm password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {repeatPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">
                  Passwords do not match.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {isLoading ? "Creating an account..." : "Sign up"}
              </Button>
            </fieldset>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
