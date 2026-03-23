import { switchTenantAction } from "@/server/actions/switch-tenant";
import { Button } from "@/components/ui/button";

type TenantSwitcherProps = {
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    role: string;
    isActive: boolean;
  }>;
};

export function TenantSwitcher({ memberships }: TenantSwitcherProps) {
  if (memberships.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {memberships.map((membership) => (
        <form key={membership.tenantId} action={switchTenantAction}>
          <input name="tenantId" type="hidden" value={membership.tenantId} />
          <Button
            type="submit"
            size="sm"
            variant={membership.isActive ? "default" : "outline"}
          >
            {membership.tenantName}
          </Button>
        </form>
      ))}
    </div>
  );
}
