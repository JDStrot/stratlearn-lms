/**
 * State and city training laws that match courses in the library.
 * Used by Team settings > State rules to suggest what each location needs.
 * Plain guidance, not legal advice: notes say when a rule applies.
 */
export type StateRule = { slug: string; note: string; city?: string };

export const STATE_RULES: Record<string, StateRule[]> = {
  CA: [
    { slug: "harassment-prevention-ca", note: "Employers with 5+ workers: everyone, within 6 months of hire, then every 2 years" },
    { slug: "harassment-prevention-ca-supervisors", note: "Supervisors: 2 hours, within 6 months of becoming one, then every 2 years" },
    { slug: "workplace-violence-ca", note: "SB 553: most workplaces, when the plan starts, then every year" },
  ],
  NY: [
    { slug: "harassment-prevention-ny", note: "All employers: every year" },
    { slug: "harassment-prevention-nyc", note: "New York City, 15+ workers: every year", city: "new york" },
    { slug: "workplace-violence-ny-retail", note: "Retail stores with 10+ workers (Retail Worker Safety Act)" },
  ],
  IL: [
    { slug: "harassment-prevention-il", note: "All employers: every year" },
    { slug: "harassment-prevention-il-restaurants", note: "Restaurants and bars: use this instead of the general Illinois course" },
  ],
  CT: [{ slug: "harassment-prevention-ct", note: "Employers with 3+ workers: within 6 months of hire" }],
};

export const US_STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

/** Rules for a location (city rules only when the city matches). */
export function rulesFor(state: string | null, city: string | null): StateRule[] {
  if (!state) return [];
  const c = (city ?? "").trim().toLowerCase();
  return (STATE_RULES[state] ?? []).filter((r) => !r.city || r.city === c);
}
