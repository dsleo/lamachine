import { CONSTRAINTS } from './constraints';

function get(id: (typeof CONSTRAINTS)[number]['id']) {
    const c = CONSTRAINTS.find((x) => x.id === id);
    if (!c) throw new Error('missing constraint');
    return c;
}

// Tiny “smoke tests” run via `ts-node`-less node is not configured here,
// but this file is still useful as a reference and is typechecked by `tsc`.
// If you later add a test runner (vitest/jest), these can become real tests.

// Hyphenated compounds should be treated as ONE word.
{
    const tautogram = get('tautogram');
    const res = tautogram.validate('mille-pattes', 'm');
    if (!res.isValid) {
        throw new Error('Expected "mille-pattes" to be valid for tautogram in "m"');
    }
}

// Apostrophes should still split (French elision).
{
    const tautogram = get('tautogram');
    const res = tautogram.validate("m'avertir", 'm');
    if (res.isValid) {
        throw new Error('Expected "m\'avertir" to be invalid for tautogram in "m"');
    }
}

