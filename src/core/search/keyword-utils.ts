export function escapeIlike(word: string): string {
  return word
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

export function extractWords(query: string): string[] {
  return query
    .trim()
    .replace(/[,."'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}
