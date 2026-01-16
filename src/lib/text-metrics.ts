export function countWords(text: string): number {
    const m = text.trim().match(/[\w'-]+(?<!-)/g);
    return m ? m.length : 0;
}

