const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export const appEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "GanadIA",
  appUrl,
};
