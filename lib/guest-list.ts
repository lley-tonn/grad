export const invitedGuests = [
  "Mugisa Lionel Casey",
  "Kissa Lucky Jordan",
  "Emilyn Afoyocan",
  "Tingo Alfred",
  "Jolly Okumu",
  "Aber Nelly",
  "Aluku Lucky Keila",
  "Thiwe Patricia",
  "Walter Pimego",
  "Piracel Peace Pimego",
  "Pimego Edward"
];

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function matchesInvitedGuests(input: string) {
  const submitted = normalize(input);
  if (!submitted) return false;

  const normalizedGuests = invitedGuests.map(normalize);
  if (normalizedGuests.every(name => submitted.includes(name))) return true;

  const entries = input.split(/[\n;,|]+/).map(normalize).filter(Boolean);
  return entries.length > 0 && entries.every(entry => normalizedGuests.some(name => {
    const nameWords = name.split(" ");
    const entryWords = entry.split(" ");
    return entryWords.every(word => nameWords.includes(word));
  }));
}
