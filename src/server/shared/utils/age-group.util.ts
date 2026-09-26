export function getAgeGroup(age: number): string {
    if (age < 30) return "19-29";
    if (age < 40) return "30-39";
    if (age < 50) return "40-49";
    if (age < 60) return "50-59";
    if (age < 70) return "60-69";
    return "70+";
}
