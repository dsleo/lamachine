export function countWords(text: string): number {
    // Unicode-aware word counter.
    // IMPORTANT: apostrophes and hyphens are treated as separators.
    // This aligns with the constraint semantics (e.g. "m'avertir" => "m" + "avertir",
    // "porte-monnaie" => "porte" + "monnaie").
    const m = text.match(/[\p{L}\p{N}]+/gu);
    return m ? m.length : 0;
}

/**
 * Counts letters only (ignores whitespace, punctuation, digits, emojis, etc.).
 * Uses Unicode letter categories so accented characters are counted too.
 */
export function countLetters(text: string): number {
    const m = text.match(/\p{L}/gu);
    return m ? m.length : 0;
}
