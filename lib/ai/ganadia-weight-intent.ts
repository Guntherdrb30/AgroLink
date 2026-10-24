/**
 * Separate the weight of ONE animal from a requested TOTAL guide weight.
 * "8.000 kilos en total, animales de al menos 450 kilos" => 450, not 8.
 */
export function requestedMinimumWeightKg(message: string, setting: number): number {
  const fallback = Number.isFinite(setting) && setting >= 1 && setting <= 2000 ? setting : 450;
  const text = message.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const unit = "(?:kg|kilos?|kilogramos?)";
  const number = "(\\d{1,4}(?:[.,]\\d{1,2})?)";
  const preceded = new RegExp(
    "(?:al menos|no menos de|peso minimo(?: de)?|minimo(?: de)?|desde|mayores? de|mas de)\\s*" +
    number + "\\s*" + unit + "\\b"
  );
  const followed = new RegExp("\\b" + number + "\\s*" + unit + "\\s*(?:o\\s+mas|como\\s+minimo)\\b");
  const match = text.match(preceded) || text.match(followed);
  if (!match) return fallback;
  const value = Number(match[1].replace(",","."));
  return Number.isFinite(value) && value>=1 && value<=2000 ? value : fallback;
}
