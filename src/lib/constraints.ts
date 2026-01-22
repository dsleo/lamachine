export const VOWELS: readonly string[] = ['a', 'e', 'i', 'o', 'u', 'y'];
export const CONSONANTS: readonly string[] = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'
];
export const ALPHABET: readonly string[] = [...VOWELS, ...CONSONANTS].sort();

// Unicode-aware word matcher.
// - `\p{L}` matches any letter (including accented letters)
// - `\p{N}` matches any number
//
// Semantics:
// - Apostrophes are treated as separators (French elision): "m'avertir" => "m" + "avertir".
// - Hyphens are treated as *in-word* for French compound words: "mille-pattes" is ONE word.
//   (So word-start constraints like tautogram/alliteration should accept it as starting with "m".)
export const WORD_REGEX = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

// Boundary used for "word-based" constraints while typing/streaming.
// Includes whitespace/punctuation + separators like apostrophes.
// NOTE: hyphen is *not* a boundary because we treat hyphenated compounds as one word.
const WORD_BOUNDARY_REGEX = /[\s.,;:!?"'’]$/;

// Normalize French letters by stripping accents/diacritics so that
// "é, è, ê, ë" are treated as "e", "à, â" as "a", "ù, û" as "u", etc.
// This lets constraints behave intuitively in French: a lipogram in "e"
// will also forbid "é", and monovocalism/alliteration work on base letters.
export const normalizeText = (input: string): string =>
  input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export type ConstraintParam =
  | {
    kind: 'select';
    type: 'letter' | 'vowel' | 'consonant';
    label: string;
    options: readonly string[];
  }
  | {
    kind: 'text';
    label: string;
    placeholder?: string;
  }
  | {
    kind: 'none';
  };

export type Constraint = {
  id:
  | 'lipogram'
  | 'monovocalism'
  | 'tautogram'
  | 'alliteration'
  | 'palindrome'
  | 'snowball'
  | 'beau-present'
  | 'pangram';
  name: string;
  description: string;
  parameter: ConstraintParam;
  validate: (
    text: string,
    param: string
  ) => { isValid: boolean; error?: string; meta?: Record<string, unknown> };
};

export type ConstraintId = Constraint['id'];

export function getConstraintById(id: ConstraintId): Constraint {
  const c = CONSTRAINTS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown constraint: ${id}`);
  return c;
}

export const CONSTRAINTS: readonly Constraint[] = [
  {
    id: 'lipogram',
    name: 'Lipogramme',
    description: 'Interdiction d’une lettre donnée.',
    parameter: {
      kind: 'select',
      type: 'letter',
      label: 'Lettre interdite',
      options: ALPHABET,
    },
    validate: (text, param) => {
      const forbiddenLetter = param.toLowerCase();
      const normalizedText = normalizeText(text.toLowerCase());
      if (normalizedText.includes(forbiddenLetter)) {
        return { isValid: false, error: `Lettre interdite détectée : "${forbiddenLetter}"` };
      }
      return { isValid: true };
    }
  },
  {
    id: 'monovocalism',
    name: 'Monovocalisme',
    description: 'Autorisation d’une seule voyelle.',
    parameter: {
      kind: 'select',
      type: 'vowel',
      label: 'Voyelle autorisée',
      options: VOWELS,
    },
    validate: (text, param) => {
      const allowedVowel = param.toLowerCase();
      const otherVowels = VOWELS.filter(v => v !== allowedVowel);
      const normalizedText = normalizeText(text.toLowerCase());
      for (const char of normalizedText) {
        if (otherVowels.includes(char)) {
          return { isValid: false, error: `Voyelle non autorisée détectée : "${char}"` };
        }
      }
      return { isValid: true };
    }
  },
  {
    id: 'tautogram',
    name: 'Tautogramme',
    description: 'Tous les mots doivent commencer par la même lettre.',
    parameter: {
      kind: 'select',
      type: 'letter',
      label: 'Lettre initiale',
      options: ALPHABET,
    },
    validate: (text, param) => {
      const words = text.match(WORD_REGEX) || [];
      const initialLetter = param.toLowerCase();
      for (const word of words) {
        const normalizedWord = normalizeText(word.toLowerCase());
        if (!normalizedWord.startsWith(initialLetter)) {
          return { isValid: false, error: `Le mot "${word}" ne commence pas par "${initialLetter}"` };
        }
      }
      return { isValid: true };
    }
  },
  {
    id: 'alliteration',
    name: 'Allitération systématique',
    description: 'Tous les mots doivent commencer par la même consonne.',
    parameter: {
      kind: 'select',
      type: 'consonant',
      label: 'Consonne initiale',
      options: CONSONANTS,
    },
    validate: (text, param) => {
      const words = text.match(WORD_REGEX) || [];
      const initialConsonant = param.toLowerCase();
      for (const word of words) {
        const normalizedWord = normalizeText(word.toLowerCase());
        if (!normalizedWord.startsWith(initialConsonant)) {
          return { isValid: false, error: `Le mot "${word}" ne commence pas par la consonne "${initialConsonant}"` };
        }
      }
      return { isValid: true };
    }
  },
  {
    id: 'palindrome',
    name: 'Palindrome',
    description: 'Texte lisible indifféremment de gauche à droite et de droite à gauche.',
    parameter: { kind: 'none' },
    validate: (text) => {
      const normalized = normalizeText(text.toLowerCase()).replace(/[^a-z0-9]/g, '');
      const reversed = [...normalized].reverse().join('');
      if (!normalized || normalized !== reversed) {
        return { isValid: false, error: 'Le texte n’est pas un palindrome parfait.' };
      }
      return { isValid: true };
    },
  },
  {
    id: 'snowball',
    name: 'Boule de neige',
    description: 'Chaque mot est plus long d’une lettre que le précédent.',
    parameter: { kind: 'none' },
    validate: (text) => {
      const words = text.match(WORD_REGEX) || [];

      if (words.length <= 1) {
        // Need at least two complete words to check the pattern.
        return { isValid: true };
      }

      const endsWithBoundary = WORD_BOUNDARY_REGEX.test(text);
      const wordsToCheck = !endsWithBoundary && words.length > 1 ? words.slice(0, -1) : words;

      let previousLength: number | null = null;

      for (const word of wordsToCheck) {
        const normalizedWord = normalizeText(word.toLowerCase());
        const lettersOnly = normalizedWord.replace(/[^a-z]/g, '');
        const length = lettersOnly.length;

        if (length === 0) continue;

        if (previousLength === null) {
          previousLength = length;
          continue;
        }

        if (length !== previousLength + 1) {
          return {
            isValid: false,
            error: `Le mot "${word}" doit avoir ${previousLength + 1} lettres (actuellement ${length}).`,
          };
        }

        previousLength = length;
      }

      return { isValid: true };
    },
  },
  {
    id: 'beau-present',
    name: 'Beau présent',
    description: 'Texte utilisant uniquement les lettres contenues dans un nom ou une phrase donnée.',
    parameter: {
      kind: 'text',
      label: 'Nom ou phrase de référence',
      placeholder: 'Ex : Georges Perec',
    },
    validate: (text, param) => {
      const normalizedSource = normalizeText(param.toLowerCase());
      const allowedLetters = new Set(
        [...normalizedSource].filter((ch) => ALPHABET.includes(ch))
      );

      if (allowedLetters.size === 0) {
        // If the user hasn’t provided any usable letters yet, don’t block typing.
        return { isValid: true };
      }

      const normalizedText = normalizeText(text.toLowerCase());
      for (const ch of normalizedText) {
        if (!ALPHABET.includes(ch)) continue; // ignore spaces, punctuation, etc.
        if (!allowedLetters.has(ch)) {
          return {
            isValid: false,
            error: `La lettre "${ch}" n’apparaît pas dans « ${param} ».`,
          };
        }
      }

      return { isValid: true };
    },
  },
  {
    id: 'pangram',
    name: 'Pangramme',
    description: 'Texte qui utilise toutes les lettres de l’alphabet au moins une fois.',
    parameter: { kind: 'none' },
    validate: (text) => {
      const normalizedText = normalizeText(text.toLowerCase());
      const usedLetters = new Set(
        [...normalizedText].filter((ch) => ALPHABET.includes(ch))
      );

      const missingLetters = ALPHABET.filter((letter) => !usedLetters.has(letter));

      // Pangramme is purely informative: never block typing,
      // only report the missing letters.
      return {
        isValid: true,
        meta: { missingLetters },
      };
    },
  }
];
