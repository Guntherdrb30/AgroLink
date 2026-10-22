/**
 * Pure authorization policy for the veterinary clinical writer.
 * The route must prove each boolean using fresh database reads inside
 * the same transaction that creates a record. Never trust client-provided roles.
 */
export type ClinicalWriteFacts = {
  role: string;
  sameTenant: boolean;
  assignedToFarm: boolean;
  animalInFarm: boolean;
  professionalProfilePresent: boolean;
};

export function canWriteClinicalRecord(facts: ClinicalWriteFacts): boolean {
  return (
    facts.role === "VETERINARIAN" &&
    facts.sameTenant &&
    facts.assignedToFarm &&
    facts.animalInFarm &&
    facts.professionalProfilePresent
  );
}

export function validateClinicalDates(
  appliedDate: string,
  followUpDate?: string,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const valid = (s: string) => datePattern.test(s) && !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  return valid(appliedDate) && appliedDate <= today &&
    (!followUpDate || (valid(followUpDate) && followUpDate >= appliedDate));
}
