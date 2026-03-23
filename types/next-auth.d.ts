import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      platformRole?: string;
      defaultTenantId?: string;
      tenantRole?: string;
    };
  }

  interface User {
    platformRole?: string;
    defaultTenantId?: string;
    tenantRole?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    platformRole?: string;
    defaultTenantId?: string;
    tenantRole?: string;
  }
}
