export function normalizeGuestName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function getMatchedGuests(input: string, invitedNames: string[]) {
  const submitted = normalizeGuestName(input);
  if (!submitted || invitedNames.length === 0) return [];

  const normalizedNames = invitedNames.map(normalizeGuestName);
  if (normalizedNames.every(name => submitted.includes(name))) return invitedNames;

  const entries = input.split(/[\n;,|]+/).map(normalizeGuestName).filter(Boolean);
  const matched = new Set<string>();
  for (const entry of entries) {
    const entryWords = entry.split(" ");
    const candidates = invitedNames.filter((_, index) => entryWords.every(word => normalizedNames[index].split(" ").includes(word)));
    if (candidates.length !== 1) return [];
    matched.add(candidates[0]);
  }
  return [...matched];
}
