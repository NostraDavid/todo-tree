declare module 'micromatch' {
  export function isMatch(value: string, patterns: string | string[]): boolean;
}
declare module 'find' {
  export function fileSync(pattern: string, root: string): string[];
}
declare module 'fast-strftime' {
  export function strftime(format: string, date?: Date): string;
}
declare module 'comment-patterns' {
  interface Syntax {
    name?: string;
    multiLineComment?: unknown[];
    singleLineComment?: { start: string }[];
  }
  interface CommentRegex {
    regex: RegExp;
    cg: { contentStart: number };
  }
  function lookup(filename: string): Syntax;
  namespace lookup {
    function regex(filename: string): CommentRegex;
  }
  export = lookup;
}

declare module '@primer/octicons' {
  const icons: Record<string, { toSVG(options: Record<string, string | number>): string }>;
  export = icons;
}
