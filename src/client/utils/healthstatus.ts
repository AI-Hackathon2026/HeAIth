import type { Gender, HealthStatus, HealthStatusInput } from "../types";

export type HealthStatusFormState = {
  gender: "" | Gender;
  age: string;
  height: string;
  weight: string;
  alcoholFreq: string;
  smokeFreq: string;
  exerciseFreq: string;
};

export function healthStatusToFormState(
  status: HealthStatus,
): HealthStatusFormState {
  return {
    gender: status.gender,
    age: String(status.age),
    height: String(status.height),
    weight: String(status.weight),
    alcoholFreq: String(status.alcoholFreq),
    smokeFreq: String(status.smokeFreq),
    exerciseFreq: String(status.exerciseFreq),
  };
}

export function parseRequiredInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return undefined;
  return Math.round(parsed);
}

export function buildHealthStatusRequest(form: HealthStatusFormState): HealthStatusInput | null {
  if (!form.gender) return null;

  const age = parseRequiredInt(form.age);
  const height = parseRequiredInt(form.height);
  const weight = parseRequiredInt(form.weight);
  const alcoholFreq = parseRequiredInt(form.alcoholFreq);
  const smokeFreq = parseRequiredInt(form.smokeFreq);
  const exerciseFreq = parseRequiredInt(form.exerciseFreq);

  if (
    age === undefined ||
    height === undefined ||
    weight === undefined ||
    alcoholFreq === undefined ||
    smokeFreq === undefined ||
    exerciseFreq === undefined
  ) {
    return null;
  }

  if (age < 19 || age > 100) return null;
  if (height < 100 || height > 250) return null;
  if (weight < 20 || weight > 250) return null;
  if (alcoholFreq < 0 || alcoholFreq > 7) return null;
  if (smokeFreq < 0 || smokeFreq > 7) return null;
  if (exerciseFreq < 0 || exerciseFreq > 7) return null;

  return {
    gender: form.gender,
    age,
    height,
    weight,
    alcoholFreq,
    smokeFreq,
    exerciseFreq,
  };
}
