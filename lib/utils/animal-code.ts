export function normalizeAnimalCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
