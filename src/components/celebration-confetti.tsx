"use client";

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function CelebrationConfetti(props: { run: boolean }) {
    const { run } = props;

    useEffect(() => {
        if (!run) return;

        // Reduced-motion friendly.
        if (typeof window !== 'undefined') {
            const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
            if (reduce) return;
        }

        const endAt = Date.now() + 900;
        const colors = ['#334155', '#64748b', '#a16207', '#c2410c', '#0f766e'];

        const tick = () => {
            confetti({
                particleCount: 42,
                spread: 70,
                origin: { y: 0.65 },
                colors,
            });
            if (Date.now() < endAt) {
                window.setTimeout(tick, 160);
            }
        };

        tick();
    }, [run]);

    return null;
}

