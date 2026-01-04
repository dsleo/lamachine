export const VOWELS: readonly string[] = ['a', 'e', 'i', 'o', 'u', 'y'];
export const CONSONANTS: readonly string[] = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 
  'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z'
];
export const ALPHABET: readonly string[] = [...VOWELS, ...CONSONANTS].sort();

const WORD_REGEX = /[\w'-]+(?<!-)/g;

export type Constraint = {
  id: 'lipogram' | 'monovocalism' | 'tautogram' | 'alliteration';
  name: string;
  description: string;
  parameter: {
    type: 'letter' | 'vowel' | 'consonant';
    label: string;
    options: readonly string[];
  };
  validate: (text: string, param: string) => { isValid: boolean, error?: string };
};

export const CONSTRAINTS: readonly Constraint[] = [
  {
    id: 'lipogram',
    name: 'Lipogramme',
    description: 'Interdiction d’une lettre donnée.',
    parameter: { type: 'letter', label: 'Lettre interdite', options: ALPHABET },
    validate: (text, param) => {
      const forbiddenLetter = param.toLowerCase();
      if (text.toLowerCase().includes(forbiddenLetter)) {
        return { isValid: false, error: `Lettre interdite détectée : "${forbiddenLetter}"` };
      }
      return { isValid: true };
    }
  },
  {
    id: 'monovocalism',
    name: 'Monovocalisme',
    description: 'Autorisation d’une seule voyelle.',
    parameter: { type: 'vowel', label: 'Voyelle autorisée', options: VOWELS },
    validate: (text, param) => {
      const allowedVowel = param.toLowerCase();
      const otherVowels = VOWELS.filter(v => v !== allowedVowel);
      for (const char of text.toLowerCase()) {
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
    parameter: { type: 'letter', label: 'Lettre initiale', options: ALPHABET },
    validate: (text, param) => {
      const words = text.match(WORD_REGEX) || [];
      const initialLetter = param.toLowerCase();
      for (const word of words) {
        if (!word.toLowerCase().startsWith(initialLetter)) {
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
    parameter: { type: 'consonant', label: 'Consonne initiale', options: CONSONANTS },
    validate: (text, param) => {
      const words = text.match(WORD_REGEX) || [];
      const initialConsonant = param.toLowerCase();
      for (const word of words) {
        if (!word.toLowerCase().startsWith(initialConsonant)) {
          return { isValid: false, error: `Le mot "${word}" ne commence pas par la consonne "${initialConsonant}"` };
        }
      }
      return { isValid: true };
    }
  }
];
