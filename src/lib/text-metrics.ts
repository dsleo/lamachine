export function countWords(text: string): number {
    const m = text.trim().match(/[\w'-]+(?<!-)/g);
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
