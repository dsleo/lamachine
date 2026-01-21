"use client";

export function LoadingDots(props: { className?: string }) {
    // 3 dots with staggered pulse, using inline delays.
    // Tailwind doesn't provide animation-delay utilities by default.
    const { className } = props;
    return (
        <span className={className ?? "inline-flex items-center gap-0.5 align-middle"} aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" style={{ animationDelay: '180ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80 animate-pulse" style={{ animationDelay: '360ms' }} />
        </span>
    );
}
