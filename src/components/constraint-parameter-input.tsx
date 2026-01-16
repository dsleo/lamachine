"use client";

import type { Constraint } from '@/lib/constraints';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ConstraintParameterInput(props: {
    constraint: Constraint;
    value: string;
    onChange: (param: string) => void;
}) {
    const { constraint, value, onChange } = props;
    const p = constraint.parameter;

    if (p.kind === 'none') return null;

    return (
        <div className="flex flex-col gap-2">
            {p.kind === 'select' && (
                <Select value={value} onValueChange={onChange}>
                    <SelectTrigger id="param-select" className="w-full md:w-[220px]">
                        <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                        {p.options.map((option) => (
                            <SelectItem key={option} value={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {p.kind === 'text' && (
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={p.placeholder}
                    rows={2}
                />
            )}
        </div>
    );
}
