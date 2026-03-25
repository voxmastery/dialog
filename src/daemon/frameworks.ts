export interface FrameworkSignature {
  readonly name: string;
  readonly patterns: readonly RegExp[];
}

export const FRAMEWORK_SIGNATURES: readonly FrameworkSignature[] = [
  {
    name: 'Express',
    patterns: [
      /Listening on port \d+/i,
      /Express server/i,
      /express.*listening/i,
    ],
  },
  {
    name: 'FastAPI',
    patterns: [
      /Uvicorn running on/i,
      /uvicorn\.main/i,
    ],
  },
  {
    name: 'Django',
    patterns: [
      /Starting development server/i,
      /Django version/i,
    ],
  },
  {
    name: 'Next.js',
    patterns: [
      /ready - started server on/i,
      /▲ Next\.js/,
      /next dev/i,
    ],
  },
  {
    name: 'Rails',
    patterns: [
      /Puma starting/i,
      /Rails.*Listening on/i,
      /bin\/rails server/i,
    ],
  },
  {
    name: 'Vite',
    patterns: [
      /Local:\s*http:\/\/localhost/i,
      /vite.*dev server/i,
    ],
  },
  {
    name: 'Nuxt',
    patterns: [
      /Nuxt.*Listening on/i,
      /nuxi dev/i,
    ],
  },
] as const;

export function identifyFramework(output: string): string {
  for (const signature of FRAMEWORK_SIGNATURES) {
    for (const pattern of signature.patterns) {
      if (pattern.test(output)) {
        return signature.name;
      }
    }
  }
  return 'unknown';
}
