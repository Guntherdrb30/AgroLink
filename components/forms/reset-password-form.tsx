import Link from "next/link";

import { resetPasswordAction } from "@/server/actions/reset-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ResetPasswordFormProps = {
  email?: string;
  token?: string;
  errorMessage?: string;
};

export function ResetPasswordForm({
  email,
  token,
  errorMessage,
}: ResetPasswordFormProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Recovery
        </p>
        <CardTitle className="text-3xl">Set a new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={resetPasswordAction} className="space-y-5">
          <input name="email" type="hidden" value={email ?? ""} />
          <input name="token" type="hidden" value={token ?? ""} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              New password
            </label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirmPassword">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
            />
          </div>
          {errorMessage ? (
            <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Update password
          </Button>
        </form>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
