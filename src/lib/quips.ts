import type { Lang } from '@/lib/i18n';

const QUIPS: Record<Lang, readonly string[]> = {
    fr: [
        'La Machine a trébuché sur une voyelle.',
        'Le papier est patient. La contrainte, moins.',
        'Un mot de trop, et tout s’écroule.',
        'Le style est intact. La règle, non.',
        'C’était presque oulipien. Presque.',
        'La grammaire sourit. La contrainte grimace.',
    ],
    en: [
        'The Machine tripped on a vowel.',
        'Paper is patient. Constraints are not.',
        'One word too far, and it all collapses.',
        'Style survived. The rule did not.',
        'That was almost Oulipian. Almost.',
        'Grammar smiled. The constraint frowned.',
    ],
};

export function pickQuip(lang: Lang, last?: string | null): string {
    const list = QUIPS[lang];
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];

    let next = list[Math.floor(Math.random() * list.length)];
    if (last && next === last) {
        next = list[(list.indexOf(next) + 1) % list.length];
    }
    return next;
}

