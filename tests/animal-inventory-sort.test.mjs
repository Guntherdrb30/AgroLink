import test from "node:test";
import assert from "node:assert/strict";
import {
  animalAgeInDays,
  formatAnimalInventoryAge,
  sortAnimalInventory,
} from "../lib/livestock/animal-inventory-sort.ts";

const asOf = "2026-10-21";
const record = (id, code, birthDate, estimatedAgeMonths = null) => ({
  id, internalCode: code, birthDate, estimatedAgeMonths,
});
test("edad descendente usa fecha de nacimiento y luego código natural", () => {
  const input = [
    record("a", "BOV-10", "2024-01-01"),
    record("b", "BOV-2", "2022-01-01"),
    record("c", "BOV-1", "2022-01-01"),
    record("d", "BOV-9", "2025-01-01"),
  ];
  assert.deepEqual(sortAnimalInventory(input, "age-desc", asOf).map(a => a.id), ["c", "b", "a", "d"]);
  assert.equal(input[0].id, "a", "no muta la entrada");
});
test("edad ascendente conserva edades desconocidas al final", () => {
  const input = [
    record("unknown", "X-1", null),
    record("old", "X-2", "2019-01-01"),
    record("young", "X-3", "2026-05-01"),
  ];
  assert.deepEqual(sortAnimalInventory(input, "age-asc", asOf).map(a => a.id), ["young", "old", "unknown"]);
  assert.deepEqual(sortAnimalInventory(input, "age-desc", asOf).map(a => a.id), ["old", "young", "unknown"]);
});
test("edad estimada funciona cuando falta fecha de nacimiento", () => {
  const input = [record("c", "X-3", "2026-04-21"), record("a", "X-1", null, 60), record("b", "X-2", null, 1)];
  assert.deepEqual(sortAnimalInventory(input, "age-desc", asOf).map(a => a.id), ["a", "c", "b"]);
  assert.equal(formatAnimalInventoryAge(input[1], asOf), "≈ 5 años");
});
test("código natural ordena valores numéricos y permite inverso", () => {
  const input = [record("3", "DEMO-10", null), record("1", "DEMO-1", null), record("2", "DEMO-2", null)];
  assert.deepEqual(sortAnimalInventory(input, "code-asc", asOf).map(a => a.id), ["1", "2", "3"]);
  assert.deepEqual(sortAnimalInventory(input, "code-desc", asOf).map(a => a.id), ["3", "2", "1"]);
});
test("años y meses calculados sin aproximar fecha conocida", () => {
  assert.equal(formatAnimalInventoryAge(record("1", "X", "2020-05-25"), asOf), "6 años 4 meses");
  assert.equal(formatAnimalInventoryAge(record("2", "X", "2026-10-20"), asOf), "Menos de 1 mes");
  assert.equal(formatAnimalInventoryAge(record("3", "X", "2025-10-21"), asOf), "1 año");
});
test("fecha inválida o futura no inventa edad y va al final", () => {
  assert.equal(animalAgeInDays(record("1", "X", "2026-02-31"), asOf), null);
  assert.equal(formatAnimalInventoryAge(record("2", "X", "2027-01-01"), asOf), "Sin edad");
});
