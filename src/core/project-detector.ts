import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join, basename, relative, normalize } from 'path';
import { glob } from 'glob';
import type { RepoConfig, DetectedService } from '../types.js';

// Helper to normalize paths to forward slashes for cross-platform compatibility
function normalizePath(p: string): string {
  return normalize(p).replace(/\\/g, '/').replace(/\/$/, '');
}

export interface ProjectDetection {
  exists: boolean;
  isDirectory: boolean;
  projectType: ProjectType | null;
  framework: string | null;
  suggestedId: string;
  suggestedCommands: RepoConfig['commands'];
  suggestedProof: RepoConfig['proof'];
  suggestedPort: number | null;
  detectedFiles: string[];
}

export type ProjectType = 'nodejs' | 'rust' | 'python' | 'go' | 'unknown';

interface FrameworkInfo {
  name: string;
  port: number;
  isFrontend: boolean;
  healthPath?: string; // API health check path for backend frameworks
}

const FRAMEWORK_DETECTION: Record<string, FrameworkInfo> = {
  // Frontend frameworks
  'vite': { name: 'Vite', port: 5173, isFrontend: true },
  'next': { name: 'Next.js', port: 3000, isFrontend: true },
  'react-scripts': { name: 'Create React App', port: 3000, isFrontend: true },
  '@angular/core': { name: 'Angular', port: 4200, isFrontend: true },
  'vue': { name: 'Vue.js', port: 5173, isFrontend: true },
  'svelte': { name: 'Svelte', port: 5173, isFrontend: true },
  'nuxt': { name: 'Nuxt', port: 3000, isFrontend: true },
  'gatsby': { name: 'Gatsby', port: 8000, isFrontend: true },
  'astro': { name: 'Astro', port: 4321, isFrontend: true },

  // Backend frameworks - health check uses root URL by default
  // NestJS apps typically use /api global prefix + /health endpoint
  'express': { name: 'Express', port: 3000, isFrontend: false },
  'fastify': { name: 'Fastify', port: 3000, isFrontend: false },
  '@nestjs/core': { name: 'NestJS', port: 3000, isFrontend: false, healthPath: '/api/health' },
  'koa': { name: 'Koa', port: 3000, isFrontend: false },
  'hapi': { name: 'Hapi', port: 3000, isFrontend: false },
  '@hapi/hapi': { name: 'Hapi', port: 3000, isFrontend: false },
  'restify': { name: 'Restify', port: 3000, isFrontend: false },
};

export async function detectProject(path: string): Promise<ProjectDetection> {
  // Normalize path for cross-platform compatibility
  const normalizedPath = normalizePath(path);

  const result: ProjectDetection = {
    exists: false,
    isDirectory: false,
    projectType: null,
    framework: null,
    suggestedId: '',
    suggestedCommands: {},
    suggestedProof: { mode: 'cli', cli: { command: 'echo "No proof configured"' } },
    suggestedPort: null,
    detectedFiles: [],
  };

  // Check if path exists
  if (!existsSync(normalizedPath)) {
    return result;
  }
  result.exists = true;

  // Check if it's a directory
  const stat = statSync(normalizedPath);
  if (!stat.isDirectory()) {
    return result;
  }
  result.isDirectory = true;

  // Generate suggested ID from directory name
  const dirName = basename(normalizedPath);
  result.suggestedId = dirName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Detect project files
  const projectFiles = [
    'package.json',
    'Cargo.toml',
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
    'go.mod',
    '.git',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'next.config.js',
    'next.config.mjs',
  ];

  for (const file of projectFiles) {
    if (existsSync(join(normalizedPath, file))) {
      result.detectedFiles.push(file);
    }
  }

  // Detect project type and framework
  if (existsSync(join(normalizedPath, 'package.json'))) {
    result.projectType = 'nodejs';
    detectNodeProject(normalizedPath, result);
  } else if (existsSync(join(normalizedPath, 'Cargo.toml'))) {
    result.projectType = 'rust';
    detectRustProject(normalizedPath, result);
  } else if (existsSync(join(normalizedPath, 'pyproject.toml')) ||
             existsSync(join(normalizedPath, 'setup.py')) ||
             existsSync(join(normalizedPath, 'requirements.txt'))) {
    result.projectType = 'python';
    detectPythonProject(normalizedPath, result);
  } else if (existsSync(join(normalizedPath, 'go.mod'))) {
    result.projectType = 'go';
    detectGoProject(normalizedPath, result);
  } else {
    result.projectType = 'unknown';
  }

  return result;
}

function detectNodeProject(path: string, result: ProjectDetection): void {
  try {
    const pkgPath = join(path, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Detect framework
    for (const [dep, info] of Object.entries(FRAMEWORK_DETECTION)) {
      if (allDeps[dep]) {
        result.framework = info.name;
        result.suggestedPort = info.port;

        // Set proof mode based on frontend vs backend
        if (info.isFrontend) {
          result.suggestedProof = {
            mode: 'web',
            web: {
              url: `http://localhost:${info.port}`,
              waitForSelector: 'body',
            },
          };
        } else {
          result.suggestedProof = {
            mode: 'api',
            api: {
              // Use {port} placeholder so proof uses actual detected port at runtime
              healthUrl: `http://localhost:{port}${info.healthPath || ''}`,
              timeout: 30000,
            },
          };
        }
        break;
      }
    }

    // Suggest commands based on scripts
    result.suggestedCommands = {
      install: 'npm install',
    };

    if (pkg.scripts?.build) {
      result.suggestedCommands.build = 'npm run build';
    }

    if (pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1') {
      result.suggestedCommands.test = 'npm test';
    }

    if (pkg.scripts?.dev) {
      result.suggestedCommands.run = 'npm run dev';
    } else if (pkg.scripts?.start) {
      result.suggestedCommands.run = 'npm start';
    }

    // Use TypeScript type check if tsconfig exists
    if (existsSync(join(path, 'tsconfig.json')) && !result.suggestedCommands.build) {
      result.suggestedCommands.build = 'npx tsc --noEmit';
    }

    // Default port if none detected but has run command
    if (!result.suggestedPort && result.suggestedCommands.run) {
      result.suggestedPort = 3000;
      result.suggestedProof = {
        mode: 'api',
        api: {
          // Use {port} placeholder so proof uses actual detected port at runtime
          healthUrl: 'http://localhost:{port}',
          timeout: 30000,
        },
      };
    }

  } catch (error) {
    // Failed to parse package.json, use minimal defaults
    result.suggestedCommands = { install: 'npm install' };
  }
}

function detectRustProject(path: string, result: ProjectDetection): void {
  result.framework = 'Cargo';
  result.suggestedCommands = {
    build: 'cargo build',
    test: 'cargo test',
    run: 'cargo run',
  };

  // Check if it's a web project (has actix, axum, rocket, etc.)
  try {
    const cargoPath = join(path, 'Cargo.toml');
    const cargo = readFileSync(cargoPath, 'utf-8');

    if (cargo.includes('actix-web') || cargo.includes('axum') ||
        cargo.includes('rocket') || cargo.includes('warp')) {
      result.suggestedPort = 8080;
      result.suggestedProof = {
        mode: 'api',
        api: {
          healthUrl: 'http://localhost:8080',
          timeout: 30000,
        },
      };
    }
  } catch {
    // Use defaults
  }
}

function detectPythonProject(path: string, result: ProjectDetection): void {
  result.framework = 'Python';

  // Check for different package managers
  if (existsSync(join(path, 'pyproject.toml'))) {
    // Check if using poetry
    try {
      const pyproject = readFileSync(join(path, 'pyproject.toml'), 'utf-8');
      if (pyproject.includes('[tool.poetry]')) {
        result.suggestedCommands = {
          install: 'poetry install',
          test: 'poetry run pytest',
        };
      } else {
        result.suggestedCommands = {
          install: 'pip install -e .',
          test: 'pytest',
        };
      }
    } catch {
      result.suggestedCommands = {
        install: 'pip install -e .',
        test: 'pytest',
      };
    }
  } else if (existsSync(join(path, 'requirements.txt'))) {
    result.suggestedCommands = {
      install: 'pip install -r requirements.txt',
      test: 'pytest',
    };
  } else {
    result.suggestedCommands = {
      install: 'pip install -e .',
      test: 'pytest',
    };
  }

  // Check for web frameworks
  try {
    const files = [
      join(path, 'requirements.txt'),
      join(path, 'pyproject.toml'),
    ];

    for (const file of files) {
      if (existsSync(file)) {
        const content = readFileSync(file, 'utf-8').toLowerCase();

        if (content.includes('fastapi') || content.includes('flask') ||
            content.includes('django') || content.includes('starlette')) {
          result.suggestedPort = 8000;
          result.suggestedProof = {
            mode: 'api',
            api: {
              healthUrl: 'http://localhost:8000',
              timeout: 30000,
            },
          };

          if (content.includes('fastapi')) {
            result.framework = 'FastAPI';
            result.suggestedCommands.run = 'uvicorn main:app --reload';
          } else if (content.includes('flask')) {
            result.framework = 'Flask';
            result.suggestedCommands.run = 'flask run';
          } else if (content.includes('django')) {
            result.framework = 'Django';
            result.suggestedCommands.run = 'python manage.py runserver';
          }
          break;
        }
      }
    }
  } catch {
    // Use defaults
  }
}

function detectGoProject(path: string, result: ProjectDetection): void {
  result.framework = 'Go';
  result.suggestedCommands = {
    build: 'go build',
    test: 'go test ./...',
    run: 'go run .',
  };

  // Check for web frameworks in go.mod
  try {
    const goModPath = join(path, 'go.mod');
    const goMod = readFileSync(goModPath, 'utf-8');

    if (goMod.includes('gin-gonic') || goMod.includes('echo') ||
        goMod.includes('fiber') || goMod.includes('chi')) {
      result.suggestedPort = 8080;
      result.suggestedProof = {
        mode: 'api',
        api: {
          healthUrl: 'http://localhost:8080',
          timeout: 30000,
        },
      };
    }
  } catch {
    // Use defaults
  }
}

/**
 * Detect workspace services in a monorepo.
 * Reads workspace configuration from package.json (npm/yarn) or pnpm-workspace.yaml
 * and returns an array of detected services that have dev or start scripts.
 */
export async function detectWorkspaceServices(repoPath: string): Promise<DetectedService[]> {
  const services: DetectedService[] = [];
  const workspacePatterns = await getWorkspacePatterns(repoPath);

  if (workspacePatterns.length === 0) {
    return services;
  }

  // Expand glob patterns to find all workspace directories
  const workspaceDirs: string[] = [];
  for (const pattern of workspacePatterns) {
    // Handle patterns like "packages/*" - glob returns paths
    const matches = await glob(pattern.replace(/\\/g, '/'), {
      cwd: repoPath,
      nodir: false,
    });
    // Filter to only include directories (those with package.json)
    for (const match of matches) {
      const fullPath = join(repoPath, match);
      if (existsSync(join(fullPath, 'package.json'))) {
        workspaceDirs.push(match);
      }
    }
  }

  // Filter and detect each workspace
  for (const dir of workspaceDirs) {
    const fullPath = join(repoPath, dir);
    const packageJsonPath = join(fullPath, 'package.json');

    if (!existsSync(packageJsonPath)) {
      continue;
    }

    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const scripts = pkg.scripts || {};

      // Only include workspaces that have dev or start script
      const hasDevScript = 'dev' in scripts;
      const hasStartScript = 'start' in scripts;

      if (!hasDevScript && !hasStartScript) {
        continue;
      }

      // Detect framework for this workspace
      const detection = await detectProject(fullPath);

      const service: DetectedService = {
        id: pkg.name || basename(dir),
        name: getDisplayName(pkg.name || basename(dir)),
        path: dir.replace(/\\/g, '/'),  // Normalize to forward slashes
        framework: detection.framework || undefined,
        runScript: hasDevScript ? 'dev' : 'start',
        suggestedPort: detection.suggestedPort || 3000,
      };

      // Set proof based on framework type
      if (detection.suggestedProof) {
        const frameworkInfo = getFrameworkInfo(detection.framework);
        if (frameworkInfo?.isFrontend) {
          service.proof = {
            mode: 'web',
            web: {
              url: `http://localhost:{port}`,
              waitForSelector: 'body',
            },
          };
        } else {
          service.proof = {
            mode: 'api',
            api: {
              healthUrl: `http://localhost:{port}${frameworkInfo?.healthPath || ''}`,
              timeout: 30000,
            },
          };
        }
      }

      services.push(service);
    } catch (error) {
      // Skip workspaces with invalid package.json
      console.warn(`Failed to parse package.json in ${dir}:`, error);
    }
  }

  return services;
}

/**
 * Get workspace patterns from package.json or pnpm-workspace.yaml
 */
async function getWorkspacePatterns(repoPath: string): Promise<string[]> {
  // Try npm/yarn workspaces from package.json
  const packageJsonPath = join(repoPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.workspaces) {
        // Handle both array format and object format (yarn workspaces)
        if (Array.isArray(pkg.workspaces)) {
          return pkg.workspaces;
        }
        if (pkg.workspaces.packages) {
          return pkg.workspaces.packages;
        }
      }
    } catch {
      // Failed to parse package.json
    }
  }

  // Try pnpm-workspace.yaml
  const pnpmWorkspacePath = join(repoPath, 'pnpm-workspace.yaml');
  if (existsSync(pnpmWorkspacePath)) {
    try {
      const content = readFileSync(pnpmWorkspacePath, 'utf-8');
      // Simple YAML parsing for packages array
      const packagesMatch = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/);
      if (packagesMatch) {
        const packages = packagesMatch[1]
          .split('\n')
          .map(line => line.match(/^\s+-\s+['"]?([^'"]+)['"]?/)?.[1])
          .filter((p): p is string => !!p);
        return packages;
      }
    } catch {
      // Failed to parse pnpm-workspace.yaml
    }
  }

  return [];
}

/**
 * Get display name from package name (strip scope prefix)
 */
function getDisplayName(packageName: string): string {
  // Remove @scope/ prefix if present
  const withoutScope = packageName.replace(/^@[^/]+\//, '');
  // Convert kebab-case to Title Case
  return withoutScope
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get framework info by name
 */
function getFrameworkInfo(frameworkName: string | null): FrameworkInfo | null {
  if (!frameworkName) return null;

  for (const info of Object.values(FRAMEWORK_DETECTION)) {
    if (info.name === frameworkName) {
      return info;
    }
  }
  return null;
}

/**
 * Check if a repo is a monorepo (has workspace configuration)
 */
export async function isMonorepo(repoPath: string): Promise<boolean> {
  const patterns = await getWorkspacePatterns(repoPath);
  return patterns.length > 0;
}

/**
 * Get the primary service from a list of services.
 * Priority: First frontend service, or first service overall.
 */
export function getPrimaryService(services: DetectedService[]): DetectedService | null {
  if (services.length === 0) return null;

  // Find first frontend service
  for (const service of services) {
    const frameworkInfo = getFrameworkInfo(service.framework || null);
    if (frameworkInfo?.isFrontend) {
      return service;
    }
  }

  // Default to first service
  return services[0];
}
