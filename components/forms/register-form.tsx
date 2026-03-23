import Link from "next/link";

import { registerAction } from "@/server/actions/register";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RegisterFormProps = {
  errorMessage?: string;
};

export function RegisterForm({ errorMessage }: RegisterFormProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Registration
        </p>
        <CardTitle className="text-3xl">Create your tenant account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={registerAction} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Full name
            </label>
            <Input id="name" name="name" placeholder="Gunther Del Rosario" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tenantName">
              Company or operation name
            </label>
            <Input
              id="tenantName"
              name="tenantName"
              placeholder="AgroLynk Demo Farm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
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
            Create account
          </Button>
        </form>
        <p className="mt-5 text-sm text-muted-foreground">
          Google access is available only after the email has an existing AgroLynk account.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to login
        </Link>
      </CardContent>
    </Card>
  );
}
