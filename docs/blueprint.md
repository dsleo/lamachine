# **App Name**: Oulipo Editor

## Core Features:

- Constraint Selection: Allows the user to select one of the supported Oulipo constraints (Lipogram, Monovocalism, Tautogram, Alliteration) via a clear menu.
- Parameter Configuration: Dynamically displays and configures parameters specific to the selected constraint (e.g., forbidden letter for Lipogram).
- Text Editor: Provides a central text area for composing text under the selected constraint. Uses a monospace or typewriter-style font.
- Real-time Constraint Validation: Automatically validates the text against the active constraint on each input event, ensuring compliance without server-side processing.
- Violation Handling: Blocks further input upon constraint violation and displays a clear, short error message (e.g., "Forbidden letter: e"). The message disappears when the text becomes valid again.
- Lipogram Validation: Validates that the text does not contain any occurrence of the forbidden letter, normalizing the text to lowercase for the validation process.
- Monovocalism Validation: Ensures that all vowels in the text belong to the allowed vowel set. Determines this validation in real time.
- Tautogram Validation: Checks that each non-empty word in the text starts with the same configured letter, splitting the text into words based on spaces and punctuation.
- Alliteration Validation: Validates that each word starts with the chosen consonant. This is determined without LLMs.

## Style Guidelines:

- Primary color: Dark grayish-blue (#455A64), evoking ink on paper.
- Background color: Very light gray (#F5F5F5) suggesting textured paper.
- Accent color: Muted gold (#A1887F) for interactive elements and subtle highlights.
- Body and headline font: 'IBM Plex Mono' (monospace) to mimic a typewriter.
- High contrast for readability with a central, distraction-free writing area.
- Subtle animations on key presses and slow blinking cursor to simulate a mechanical typewriter.