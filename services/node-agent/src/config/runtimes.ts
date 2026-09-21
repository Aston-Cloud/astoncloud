export type SupportedRuntime = 'nodejs' | 'bun' | 'python';

export interface ApprovedRuntimeConfig {
  id: SupportedRuntime;
  name: string;
  defaultPort: number;
  workingDir: string;
  versions: Record<string, { image: string; defaultCmd?: string[] }>;
}

export const APPROVED_RUNTIMES: Record<SupportedRuntime, ApprovedRuntimeConfig> = {
  nodejs: {
    id: 'nodejs',
    name: 'Node.js',
    defaultPort: 3000,
    workingDir: '/app',
    versions: {
      '20': {
        image: 'node:20-alpine',
        defaultCmd: ['node', 'index.js'],
      },
      '22': {
        image: 'node:22-alpine',
        defaultCmd: ['node', 'index.js'],
      },
      '24': {
        image: 'node:24-alpine',
        defaultCmd: ['node', 'index.js'],
      },
    },
  },
  bun: {
    id: 'bun',
    name: 'Bun',
    defaultPort: 8080,
    workingDir: '/app',
    versions: {
      latest: {
        image: 'oven/bun:latest',
        defaultCmd: ['bun', 'run', 'index.ts'],
      },
      stable: {
        image: 'oven/bun:1.2-alpine',
        defaultCmd: ['bun', 'run', 'index.ts'],
      },
    },
  },
  python: {
    id: 'python',
    name: 'Python',
    defaultPort: 8000,
    workingDir: '/app',
    versions: {
      '3.11': {
        image: 'python:3.11-slim',
        defaultCmd: ['python', 'main.py'],
      },
      '3.12': {
        image: 'python:3.12-slim',
        defaultCmd: ['python', 'main.py'],
      },
      '3.13': {
        image: 'python:3.13-slim',
        defaultCmd: ['python', 'main.py'],
      },
    },
  },
};

export function resolveApprovedImage(
  runtime: string,
  version: string
): { image: string; defaultPort: number; workingDir: string; defaultCmd?: string[] } | null {
  const rtKey = runtime.toLowerCase().trim() as SupportedRuntime;
  const runtimeConfig = APPROVED_RUNTIMES[rtKey];
  if (!runtimeConfig) {
    return null;
  }

  const verKey = version.trim();
  const matchedVersion = runtimeConfig.versions[verKey];
  if (!matchedVersion) {
    return null;
  }

  return {
    image: matchedVersion.image,
    defaultPort: runtimeConfig.defaultPort,
    workingDir: runtimeConfig.workingDir,
    defaultCmd: matchedVersion.defaultCmd,
  };
}
