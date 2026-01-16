export const DEFAULT_MODEL = 'gpt-4o-mini' as const;
export type ModelId = typeof DEFAULT_MODEL | (string & {});

