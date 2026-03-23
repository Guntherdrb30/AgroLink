import Link from "next/link";

import { authenticateAction } from "@/server/actions/sign-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  errorMessage?: string;
  successMessage?: string;
  next?: string;
};

export function LoginForm({
  errorMessage,
  successMessage,
  next,
}: LoginFormProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Access
        </p>
        <CardTitle className="text-3xl">Sign in to AgroLynk</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={authenticateAction} className="space-y-5">
          <input name="next" type="hidden" value={next ?? ""} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="operations@company.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              required
            />
          </div>
          {errorMessage ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          {successMessage ? (
            <p className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              {successMessage}
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Sign in
          </Button>
          <Button
            className="w-full"
            type="submit"
            variant="outline"
            name="provider"
            value="google"
          >
            Continue with Google
          </Button>
        </form>
        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="font-medium text-primary">
            Forgot password
          </Link>
          <Link href="/register" className="font-medium text-primary">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
