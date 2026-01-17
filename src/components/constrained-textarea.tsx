"use client";

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Constraint } from '@/lib/constraints';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const WORD_BASED_CONSTRAINTS = new Set<Constraint['id']>(['tautogram', 'alliteration', 'snowball']);

function endsWithBoundary(text: string) {
    return /[\s.,;:!?]$/.test(text);
}

export type ValidationResult = {
    isValid: boolean;
    error?: string;
    meta?: Record<string, unknown>;
};

export function ConstrainedTextarea(props: {
    constraint: Constraint;
    param: string;
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    disabled?: boolean;
    blockInvalidEdits?: boolean;
    showError?: boolean;
    onValidation?: (res: ValidationResult) => void;
    onBlockedInvalidEdit?: (res: ValidationResult) => void;
}) {
    const {
        constraint,
        param,
        value,
        onChange,
        placeholder,
        rows = 10,
        className,
        disabled = false,
        blockInvalidEdits = true,
        showError = true,
        onValidation,
        onBlockedInvalidEdit,
    } = props;

    const requiresParam = constraint.parameter.kind !== 'none';
    const hasParam = !requiresParam || !!param;

    const [error, setError] = useState<string | null>(null);

    const validate = useMemo(() => {
        return (text: string): ValidationResult => {
            // Palindrome: allow typing freely, validation is typically user-triggered elsewhere.
            if (constraint.id === 'palindrome') return { isValid: true };

            if (!hasParam) return { isValid: true };
            return constraint.validate(text, param);
        };
    }, [constraint, param, hasParam]);

    const handleChange = (next: string) => {
        // For word-based constraints, avoid validating mid-word, which causes
        // false negatives while the user is still typing the current token.
        if (WORD_BASED_CONSTRAINTS.has(constraint.id)) {
            const isDeleting = next.length < value.length;
            if (!isDeleting && next.length > 0 && !endsWithBoundary(next)) {
                setError(null);
                onChange(next);
                return;
            }
        }

        const res = validate(next);
        onValidation?.(res);

        if (!res.isValid) {
            setError(res.error ?? 'Erreur de contrainte');
            if (blockInvalidEdits && next.length >= value.length) {
                // Block growth while invalid; allow backspace to recover.
                onBlockedInvalidEdit?.(res);
                return;
            }
            onChange(next);
            return;
        }

        setError(null);
        onChange(next);
    };

    return (
        <div className="space-y-2">
            <Textarea
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn('typewriter-textarea', error && 'border-destructive focus-visible:ring-destructive', className)}
                rows={rows}
            />
            {showError && error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
