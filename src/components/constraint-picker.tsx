"use client";

import { CONSTRAINTS, type Constraint } from '@/lib/constraints';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type ConstraintId = (typeof CONSTRAINTS)[number]['id'];

export function getConstraintById(id: ConstraintId): Constraint {
    const c = CONSTRAINTS.find((x) => x.id === id);
    if (!c) throw new Error(`Unknown constraint: ${id}`);
    return c;
}

export function ConstraintPicker(props: {
    value: ConstraintId;
    onChange: (id: ConstraintId) => void;
}) {
    const { value, onChange } = props;

    return (
        <RadioGroup
            value={value}
            onValueChange={(v) => onChange(v as ConstraintId)}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
            {CONSTRAINTS.map((constraint) => (
                <Label
                    key={constraint.id}
                    htmlFor={constraint.id}
                    className="flex cursor-pointer flex-col items-start gap-2 rounded-md border p-4 hover:bg-accent/50 hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                >
                    <div className="flex items-center gap-2">
                        <RadioGroupItem value={constraint.id} id={constraint.id} />
                        <span className="font-bold">{constraint.name}</span>
                    </div>
                    <span className="pl-6 text-xs text-muted-foreground">{constraint.description}</span>
                </Label>
            ))}
        </RadioGroup>
    );
}

