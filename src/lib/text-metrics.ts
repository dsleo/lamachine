export function countWords(text: string): number {
    // Unicode-aware word counter.
    // Semantics:
    // - Apostrophes are separators (French elision): "m'avertir" => "m" + "avertir".
    // - Hyphens are part of the word for compounds: "mille-pattes" is ONE word.
    const m = text.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu);
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
