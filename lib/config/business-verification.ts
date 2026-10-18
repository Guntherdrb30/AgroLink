/**
 * Business/documentary verification can be postponed during the GanadIA MVP.
 * Authentication (Clerk), tenant isolation and role checks are NOT disabled.
 * When this variable is absent, the requirement defaults to enabled.
 */
export function isBusinessVerificationRequired(
  setting: string | undefined = process.env.GANADIA_REQUIRE_BUSINESS_VERIFICATION,
): boolean {
  return setting !== "false";
}
