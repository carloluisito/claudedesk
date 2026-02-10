/**
 * Atlas Manager — Core scan engine for Repository Atlas Engine.
 *
 * Responsibilities:
 * - File enumeration (respects .gitignore)
 * - Language detection by extension
 * - Import extraction via regex
 * - Import graph construction
 * - Domain inference (3-tier: directory → import clustering → naming)
 * - Entrypoint detection
 * - Template-based CLAUDE.md and repo-index.md generation
 * - Inline tag selection
 * - Atomic file writing
 */

import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import type {
  AtlasSettings,
  AtlasGenerateRequest,
  AtlasGenerateResult,
  AtlasWriteRequest,
  AtlasWriteResult,
  AtlasStatus,
  AtlasScanProgress,
  AtlasScanResult,
  AtlasGeneratedContent,
  SourceFileInfo,
  InferredDomain,
  CrossDependency,
  InlineTag,
  SupportedLanguage,
  DomainSensitivity,
} from '../shared/types/atlas-types';

// Directories always excluded from scanning
const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next',
  'coverage', '__pycache__', '.venv', 'vendor', 'target',
  'bin', 'obj', '.cache', '.turbo', '.parcel-cache',
]);

// Extension → language mapping
const EXT_LANG_MAP: Record<string, SupportedLanguage> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin', '.kts': 'kotlin',
  '.cs': 'csharp',
  '.css': 'css', '.scss': 'css', '.less': 'css',
  '.html': 'html', '.htm': 'html',
  '.json': 'json', '.jsonc': 'json',
  '.yaml': 'yaml', '.yml': 'yaml',
  '.md': 'markdown', '.mdx': 'markdown',
};

// Import extraction patterns per language
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  typescript: [
    /import\s+(?:type\s+)?(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  javascript: [
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ],
  python: [
    /^import\s+([\w.]+)/gm,
    /^from\s+([\w.]+)\s+import/gm,
  ],
  go: [
    /import\s+"([^"]+)"/g,
    /import\s+\w+\s+"([^"]+)"/g,
  ],
  rust: [
    /use\s+([\w:]+)/g,
    /extern\s+crate\s+(\w+)/g,
  ],
  java: [
    /import\s+(?:static\s+)?([a-zA-Z][\w.]*)/g,
  ],
  kotlin: [
    /import\s+([a-zA-Z][\w.]*)/g,
  ],
  csharp: [
    /using\s+(?:static\s+)?([a-zA-Z][\w.]*)/g,
  ],
  css: [
    /@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g,
  ],
};

export class AtlasManager {
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  destroy(): void {
    this.mainWindow = null;
  }

  private emitProgress(progress: AtlasScanProgress): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('atlas:scanProgress', progress);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────

  async generateAtlas(request: AtlasGenerateRequest): Promise<AtlasGenerateResult> {
    const startTime = Date.now();
    const projectPath = request.projectPath;
    const settings: AtlasSettings = {
      enableAtlas: true,
      maxInlineTags: 20,
      domainInferenceSensitivity: 'medium',
      atlasOutputLocation: 'root',
      excludePatterns: [],
      scanTimeoutMs: 30000,
      ...(request.settings || {}),
    };

    // Phase 1: Enumerate files
    this.emitProgress({ phase: 'enumerating', current: 0, total: 0, message: 'Discovering source files...' });
    const files = await this.enumerateFiles(projectPath, settings.excludePatterns);
    this.emitProgress({ phase: 'enumerating', current: files.length, total: files.length, message: `Found ${files.length} source files` });

    // Phase 2: Analyze imports
    this.emitProgress({ phase: 'analyzing', current: 0, total: files.length, message: 'Analyzing imports...' });
    const analyzedFiles = await this.analyzeFiles(projectPath, files, settings);
    this.emitProgress({ phase: 'analyzing', current: analyzedFiles.length, total: analyzedFiles.length, message: 'Import analysis complete' });

    // Phase 3: Infer structure
    this.emitProgress({ phase: 'inferring', current: 0, total: 1, message: 'Inferring domains...' });
    const dependencies = this.buildDependencyGraph(analyzedFiles);
    const domains = this.inferDomains(analyzedFiles, dependencies, settings.domainInferenceSensitivity);
    const inlineTags = this.selectInlineTags(analyzedFiles, domains, settings.maxInlineTags);
    this.emitProgress({ phase: 'inferring', current: 1, total: 1, message: `Found ${domains.length} domains` });

    // Build language stats
    const languages: Record<SupportedLanguage, number> = {} as Record<SupportedLanguage, number>;
    for (const file of analyzedFiles) {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }

    const totalLines = analyzedFiles.reduce((sum, f) => sum + f.lineCount, 0);

    const scanResult: AtlasScanResult = {
      files: analyzedFiles,
      totalFiles: analyzedFiles.length,
      totalLines,
      languages,
      dependencies,
      domains,
      inlineTags,
      scanDurationMs: Date.now() - startTime,
    };

    // Phase 4: Generate content
    this.emitProgress({ phase: 'generating', current: 0, total: 2, message: 'Generating CLAUDE.md...' });
    const claudeMd = this.generateClaudeMd(projectPath, scanResult, settings);
    this.emitProgress({ phase: 'generating', current: 1, total: 2, message: 'Generating repo-index.md...' });
    const repoIndex = this.generateRepoIndex(projectPath, scanResult);
    this.emitProgress({ phase: 'generating', current: 2, total: 2, message: 'Generation complete' });

    // Read existing files for diff
    const existingClaudeMd = this.readExistingFile(projectPath, 'CLAUDE.md');
    const existingRepoIndex = this.readExistingFile(projectPath, 'docs/repo-index.md');

    const generatedContent: AtlasGeneratedContent = {
      claudeMd,
      repoIndex,
      inlineTags,
      existingClaudeMd,
      existingRepoIndex,
    };

    return { scanResult, generatedContent };
  }

  async writeAtlas(request: AtlasWriteRequest): Promise<AtlasWriteResult> {
    const { projectPath, claudeMd, repoIndex, inlineTags } = request;
    let claudeMdWritten = false;
    let repoIndexWritten = false;
    let inlineTagsWritten = 0;

    // Write CLAUDE.md atomically
    try {
      const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
      this.atomicWrite(claudeMdPath, claudeMd);
      claudeMdWritten = true;
    } catch (err) {
      console.error('Failed to write CLAUDE.md:', err);
    }

    // Write docs/repo-index.md atomically
    try {
      const docsDir = path.join(projectPath, 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      const repoIndexPath = path.join(docsDir, 'repo-index.md');
      this.atomicWrite(repoIndexPath, repoIndex);
      repoIndexWritten = true;
    } catch (err) {
      console.error('Failed to write repo-index.md:', err);
    }

    // Write selected inline tags
    for (const tag of inlineTags) {
      if (!tag.selected) continue;
      try {
        this.writeInlineTag(tag.filePath, tag.suggestedTag);
        inlineTagsWritten++;
      } catch (err) {
        console.error(`Failed to write inline tag to ${tag.filePath}:`, err);
      }
    }

    return { claudeMdWritten, repoIndexWritten, inlineTagsWritten };
  }

  async getStatus(projectPath: string): Promise<AtlasStatus> {
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    const repoIndexPath = path.join(projectPath, 'docs', 'repo-index.md');

    const hasClaudeMd = fs.existsSync(claudeMdPath);
    const hasRepoIndex = fs.existsSync(repoIndexPath);

    let lastGenerated: number | null = null;
    if (hasClaudeMd) {
      try {
        const stat = fs.statSync(claudeMdPath);
        lastGenerated = stat.mtimeMs;
      } catch { /* ignore */ }
    }

    // Count existing inline tags
    let inlineTagCount = 0;
    try {
      const files = this.findFilesWithAtlasTag(projectPath);
      inlineTagCount = files.length;
    } catch { /* ignore */ }

    return {
      hasAtlas: hasClaudeMd || hasRepoIndex,
      claudeMdPath: hasClaudeMd ? claudeMdPath : null,
      repoIndexPath: hasRepoIndex ? repoIndexPath : null,
      lastGenerated,
      inlineTagCount,
    };
  }

  // ─── File Enumeration ────────────────────────────────────────────

  private async enumerateFiles(projectPath: string, extraExclude: string[]): Promise<string[]> {
    const files: string[] = [];
    const excludeSet = new Set([...EXCLUDED_DIRS, ...extraExclude]);

    // Try to use git ls-files for .gitignore-aware listing
    try {
      const result = child_process.execSync(
        'git ls-files --cached --others --exclude-standard',
        { cwd: projectPath, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      const gitFiles = result.split('\n').filter(Boolean);
      for (const relPath of gitFiles) {
        // Skip excluded directories
        const parts = relPath.split('/');
        if (parts.some(p => excludeSet.has(p))) continue;
        // Only include files with known extensions
        const ext = path.extname(relPath).toLowerCase();
        if (EXT_LANG_MAP[ext]) {
          files.push(relPath);
        }
      }
      return files;
    } catch {
      // Not a git repo or git not available — fall back to manual walk
    }

    // Manual directory walk
    const walk = (dir: string, prefix: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (excludeSet.has(entry.name) || entry.name.startsWith('.')) continue;
          walk(path.join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (EXT_LANG_MAP[ext]) {
            files.push(prefix ? `${prefix}/${entry.name}` : entry.name);
          }
        }
      }
    };

    walk(projectPath, '');
    return files;
  }

  // ─── File Analysis ───────────────────────────────────────────────

  private async analyzeFiles(
    projectPath: string,
    relativePaths: string[],
    _settings: AtlasSettings
  ): Promise<SourceFileInfo[]> {
    const results: SourceFileInfo[] = [];

    for (let i = 0; i < relativePaths.length; i++) {
      const relPath = relativePaths[i];
      const absPath = path.join(projectPath, relPath);

      if (i % 20 === 0) {
        this.emitProgress({
          phase: 'analyzing',
          current: i,
          total: relativePaths.length,
          message: `Analyzing ${relPath}`,
        });
      }

      try {
        const stat = fs.statSync(absPath);
        const ext = path.extname(relPath).toLowerCase();
        const language = EXT_LANG_MAP[ext] || 'unknown';

        let content: string;
        try {
          content = fs.readFileSync(absPath, 'utf-8');
        } catch {
          continue;
        }

        const lineCount = content.split('\n').length;
        const imports = this.extractImports(content, language);
        const exports = this.extractExports(content, language);
        const layer = this.detectLayer(relPath);

        results.push({
          relativePath: relPath.replace(/\\/g, '/'),
          absolutePath: absPath,
          language,
          lineCount,
          sizeBytes: stat.size,
          imports,
          exports,
          layer,
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return results;
  }

  private extractImports(content: string, language: SupportedLanguage): string[] {
    const patterns = IMPORT_PATTERNS[language];
    if (!patterns) return [];

    const imports = new Set<string>();
    for (const pattern of patterns) {
      // Reset regex state
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        if (match[1]) {
          imports.add(match[1]);
        }
      }
    }
    return [...imports];
  }

  private extractExports(content: string, language: SupportedLanguage): string[] {
    if (language !== 'typescript' && language !== 'javascript') return [];

    const exports = new Set<string>();
    const exportPattern = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = exportPattern.exec(content)) !== null) {
      if (match[1]) exports.add(match[1]);
    }
    return [...exports];
  }

  private detectLayer(relPath: string): 'main' | 'renderer' | 'shared' | 'preload' | 'other' {
    const normalized = relPath.replace(/\\/g, '/');
    if (normalized.includes('src/main/') || normalized.startsWith('main/')) return 'main';
    if (normalized.includes('src/renderer/') || normalized.startsWith('renderer/')) return 'renderer';
    if (normalized.includes('src/shared/') || normalized.startsWith('shared/')) return 'shared';
    if (normalized.includes('src/preload/') || normalized.startsWith('preload/')) return 'preload';
    return 'other';
  }

  // ─── Dependency Graph ────────────────────────────────────────────

  private buildDependencyGraph(files: SourceFileInfo[]): CrossDependency[] {
    const fileMap = new Map<string, SourceFileInfo>();
    for (const file of files) {
      // Index by various path forms for matching
      const rel = file.relativePath;
      fileMap.set(rel, file);

      // Without extension
      const noExt = rel.replace(/\.[^.]+$/, '');
      fileMap.set(noExt, file);

      // Just filename without extension
      const basename = path.basename(rel, path.extname(rel));
      if (!fileMap.has(basename)) {
        fileMap.set(basename, file);
      }
    }

    const deps: CrossDependency[] = [];
    const depMap = new Map<string, number>();

    for (const file of files) {
      for (const imp of file.imports) {
        // Skip external packages
        if (!imp.startsWith('.') && !imp.startsWith('/') && !imp.startsWith('src/')) continue;

        // Resolve relative import
        let resolvedPath: string;
        if (imp.startsWith('.')) {
          const dir = path.dirname(file.relativePath);
          resolvedPath = path.posix.normalize(path.posix.join(dir, imp));
        } else {
          resolvedPath = imp;
        }

        // Try to find the target file
        const target = fileMap.get(resolvedPath) ||
          fileMap.get(resolvedPath + '/index') ||
          fileMap.get(resolvedPath.replace(/\.[^.]+$/, ''));

        if (target && target.relativePath !== file.relativePath) {
          const key = `${file.relativePath}→${target.relativePath}`;
          depMap.set(key, (depMap.get(key) || 0) + 1);
        }
      }
    }

    for (const [key, count] of depMap) {
      const [from, to] = key.split('→');
      deps.push({ from, to, importCount: count });
    }

    return deps;
  }

  // ─── Domain Inference ────────────────────────────────────────────

  private inferDomains(
    files: SourceFileInfo[],
    dependencies: CrossDependency[],
    sensitivity: DomainSensitivity
  ): InferredDomain[] {
    // Tier 1 (all sensitivity levels): Directory-based grouping
    const dirDomains = this.inferByDirectory(files);

    if (sensitivity === 'low') {
      return dirDomains;
    }

    // Tier 2 (medium+): Refine with import clustering
    const refined = this.refineWithImports(dirDomains, dependencies);

    if (sensitivity === 'medium') {
      return refined;
    }

    // Tier 3 (high): Further refine with naming conventions
    return this.refineWithNaming(refined, files);
  }

  private inferByDirectory(files: SourceFileInfo[]): InferredDomain[] {
    const domainMap = new Map<string, SourceFileInfo[]>();

    for (const file of files) {
      const parts = file.relativePath.split('/');

      // Skip files in root or src root
      let domainName: string;
      if (parts.length <= 1) {
        domainName = 'root';
      } else if (parts[0] === 'src' && parts.length >= 3) {
        // Use second-level directory after src/main, src/renderer, etc.
        // e.g., src/renderer/components → components, src/renderer/hooks → hooks
        // But group by functional area if possible
        if (parts.length >= 4 && (parts[1] === 'renderer' || parts[1] === 'main')) {
          domainName = parts[2]; // e.g., 'components', 'hooks'
        } else {
          domainName = parts[1]; // e.g., 'main', 'renderer', 'shared'
        }
      } else {
        domainName = parts[0];
      }

      if (!domainMap.has(domainName)) {
        domainMap.set(domainName, []);
      }
      domainMap.get(domainName)!.push(file);
    }

    return this.buildDomainsFromMap(domainMap);
  }

  private refineWithImports(
    domains: InferredDomain[],
    _dependencies: CrossDependency[]
  ): InferredDomain[] {
    // Group by IPC channel prefix if detected
    const ipcPrefixes = new Map<string, Set<string>>();

    for (const domain of domains) {
      for (const file of domain.files) {
        // Look at imports to find IPC channel patterns
        for (const imp of file.imports) {
          // Check for IPC-related imports
          if (imp.includes('ipc-contract') || imp.includes('ipc-types')) {
            // This file uses IPC — try to detect channel prefix from filename
            const baseName = path.basename(file.relativePath, path.extname(file.relativePath));
            const prefix = this.guessIpcPrefix(baseName);
            if (prefix) {
              if (!ipcPrefixes.has(domain.name)) {
                ipcPrefixes.set(domain.name, new Set());
              }
              ipcPrefixes.get(domain.name)!.add(prefix);
            }
          }
        }
      }
    }

    // Enrich domains with IPC prefixes
    return domains.map(domain => ({
      ...domain,
      ipcPrefix: ipcPrefixes.has(domain.name)
        ? [...ipcPrefixes.get(domain.name)!].join(', ')
        : domain.ipcPrefix,
    }));
  }

  private refineWithNaming(
    domains: InferredDomain[],
    files: SourceFileInfo[]
  ): InferredDomain[] {
    // Try to merge domains that share naming patterns
    // e.g., session-manager.ts + useSessionManager.ts + SessionPanel.tsx → "Sessions"
    const managerPattern = /^(.+)-manager\.(ts|js)$/;
    const hookPattern = /^use(.+)\.(ts|tsx)$/;

    const functionalGroups = new Map<string, SourceFileInfo[]>();

    for (const file of files) {
      const baseName = path.basename(file.relativePath);
      let groupName: string | null = null;

      const managerMatch = baseName.match(managerPattern);
      if (managerMatch) {
        groupName = managerMatch[1];
      }

      const hookMatch = baseName.match(hookPattern);
      if (hookMatch) {
        groupName = hookMatch[1].replace(/^([A-Z])/, (_, c) => c.toLowerCase());
      }

      if (groupName) {
        if (!functionalGroups.has(groupName)) {
          functionalGroups.set(groupName, []);
        }
        functionalGroups.get(groupName)!.push(file);
      }
    }

    // For now, return domains with enhanced naming
    return domains.map(domain => {
      // Try to find a better name from functional groups
      for (const [groupName, groupFiles] of functionalGroups) {
        const overlap = domain.files.filter(f => groupFiles.includes(f));
        if (overlap.length > 0 && overlap.length >= domain.files.length * 0.3) {
          return {
            ...domain,
            name: this.capitalize(groupName),
          };
        }
      }
      return domain;
    });
  }

  private buildDomainsFromMap(domainMap: Map<string, SourceFileInfo[]>): InferredDomain[] {
    const domains: InferredDomain[] = [];

    for (const [name, files] of domainMap) {
      const mainFiles = files.filter(f => f.layer === 'main').map(f => f.relativePath);
      const rendererFiles = files.filter(f => f.layer === 'renderer').map(f => f.relativePath);
      const sharedFiles = files.filter(f => f.layer === 'shared').map(f => f.relativePath);

      // Detect entrypoints (files with most exports or 'index' in name)
      const entrypoints = files
        .filter(f => f.exports.length > 3 || path.basename(f.relativePath).startsWith('index'))
        .map(f => f.relativePath);

      // Guess IPC prefix from filenames
      const prefix = this.guessIpcPrefixFromFiles(files);

      domains.push({
        name: this.capitalize(name),
        files,
        ipcPrefix: prefix,
        mainFiles,
        rendererFiles,
        sharedFiles,
        entrypoints,
      });
    }

    return domains.sort((a, b) => b.files.length - a.files.length);
  }

  private guessIpcPrefix(baseName: string): string | null {
    // Map common manager names to IPC prefixes
    const prefixMap: Record<string, string> = {
      'session-manager': 'session:*',
      'cli-manager': 'session:*',
      'settings-persistence': 'settings:*',
      'agent-team-manager': 'teams:*',
      'history-manager': 'history:*',
      'checkpoint-manager': 'checkpoint:*',
      'prompt-templates-manager': 'template:*',
      'quota-service': 'quota:*',
      'file-dragdrop-handler': 'dragdrop:*',
      'atlas-manager': 'atlas:*',
    };
    return prefixMap[baseName] || null;
  }

  private guessIpcPrefixFromFiles(files: SourceFileInfo[]): string | null {
    for (const file of files) {
      const baseName = path.basename(file.relativePath, path.extname(file.relativePath));
      const prefix = this.guessIpcPrefix(baseName);
      if (prefix) return prefix;
    }
    return null;
  }

  // ─── Inline Tags ─────────────────────────────────────────────────

  private selectInlineTags(
    files: SourceFileInfo[],
    domains: InferredDomain[],
    maxTags: number
  ): InlineTag[] {
    const tags: InlineTag[] = [];

    // Score files for tag worthiness
    const scored = files.map(file => {
      let score = 0;
      const reasons: string[] = [];

      // Entrypoints get highest priority
      const baseName = path.basename(file.relativePath);
      if (baseName === 'index.ts' || baseName === 'index.tsx' || baseName === 'index.js') {
        score += 5;
        reasons.push('entrypoint');
      }

      // Files with many exports
      if (file.exports.length > 5) {
        score += 3;
        reasons.push('high export count');
      }

      // Manager files
      if (baseName.includes('-manager')) {
        score += 4;
        reasons.push('domain manager');
      }

      // App root component
      if (baseName === 'App.tsx' || baseName === 'App.ts') {
        score += 5;
        reasons.push('root component');
      }

      // IPC contract
      if (baseName.includes('ipc-contract') || baseName.includes('ipc-types')) {
        score += 5;
        reasons.push('IPC contract');
      }

      // Large files (likely important)
      if (file.lineCount > 200) {
        score += 1;
        reasons.push('substantial file');
      }

      return { file, score, reasons };
    });

    // Sort by score, take top N
    scored.sort((a, b) => b.score - a.score);

    for (const { file, reasons } of scored.slice(0, maxTags)) {
      if (reasons.length === 0) continue;

      // Check if file already has an atlas tag
      const currentTag = this.readCurrentTag(file.absolutePath);

      // Build suggested tag
      const domainName = this.findDomainForFile(file, domains);
      const layerLabel = file.layer === 'other' ? '' : ` (${file.layer})`;
      const suggestedTag = `// @atlas-entrypoint: ${domainName || file.layer}${layerLabel} — ${reasons.join(', ')}`;

      tags.push({
        filePath: file.absolutePath,
        relativePath: file.relativePath,
        currentTag,
        suggestedTag,
        reason: reasons.join(', '),
        selected: currentTag === null, // Auto-select only if no existing tag
      });
    }

    return tags;
  }

  private readCurrentTag(absolutePath: string): string | null {
    try {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      const match = content.match(/\/\/\s*@atlas-entrypoint:.*$/m);
      return match ? match[0] : null;
    } catch {
      return null;
    }
  }

  private findDomainForFile(file: SourceFileInfo, domains: InferredDomain[]): string | null {
    for (const domain of domains) {
      if (domain.files.some(f => f.relativePath === file.relativePath)) {
        return domain.name;
      }
    }
    return null;
  }

  private findFilesWithAtlasTag(projectPath: string): string[] {
    const result: string[] = [];
    try {
      const output = child_process.execSync(
        'git grep -l "@atlas-entrypoint" -- "*.ts" "*.tsx" "*.js" "*.jsx"',
        { cwd: projectPath, encoding: 'utf-8' }
      );
      return output.split('\n').filter(Boolean);
    } catch {
      return result;
    }
  }

  // ─── Content Generation ──────────────────────────────────────────

  private generateClaudeMd(
    projectPath: string,
    scanResult: AtlasScanResult,
    _settings: AtlasSettings
  ): string {
    const projectName = path.basename(projectPath);
    const { totalFiles, totalLines, domains, languages } = scanResult;

    // Find top languages
    const langEntries = Object.entries(languages)
      .filter(([lang]) => lang !== 'unknown')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const techStack = langEntries.map(([lang, count]) => `${this.capitalize(lang)} (${count})`).join(' | ');

    // Build domain map table
    let domainTable = '| Domain | Main | Renderer | Shared | IPC Prefix |\n';
    domainTable += '|--------|------|----------|--------|------------|\n';
    for (const domain of domains) {
      const main = domain.mainFiles.map(f => path.basename(f)).join(', ') || '-';
      const renderer = domain.rendererFiles.map(f => path.basename(f)).join(', ') || '-';
      const shared = domain.sharedFiles.map(f => path.basename(f)).join(', ') || '-';
      const prefix = domain.ipcPrefix || '-';
      domainTable += `| ${domain.name} | ${main} | ${renderer} | ${shared} | ${prefix} |\n`;
    }

    return `# ${projectName}

## Stats
${totalFiles} source files | ~${totalLines.toLocaleString()} LOC | ${domains.length} domains

## Tech Stack
${techStack}

## Domain Map
${domainTable}
## Adding a New IPC Method
1. Add entry to \`src/shared/ipc-contract.ts\`
2. Add handler in \`src/main/ipc-handlers.ts\`
(Preload bridge and types auto-derive.)

## Adding a New Domain
1. Create \`src/main/<domain>-manager.ts\`
2. Create \`src/renderer/hooks/use<Domain>.ts\`
3. Create component(s) in \`src/renderer/components/\`
4. Add IPC methods to contract with \`<domain>:*\` prefix
5. Update \`docs/repo-index.md\`

## Docs
- [Repo Index](docs/repo-index.md) - detailed domain-to-file mapping
`;
  }

  private generateRepoIndex(
    projectPath: string,
    scanResult: AtlasScanResult
  ): string {
    const projectName = path.basename(projectPath);
    const { domains, totalFiles, totalLines } = scanResult;

    let content = `# ${projectName} — Repo Index\n\n`;
    content += `${totalFiles} files | ~${totalLines.toLocaleString()} LOC | ${domains.length} domains\n\n`;

    // Entrypoints section
    const entrypoints = scanResult.files.filter(f => {
      const base = path.basename(f.relativePath);
      return base === 'index.ts' && (f.layer === 'main' || f.layer === 'preload');
    });
    if (entrypoints.length > 0) {
      content += `## Entrypoints\n\n`;
      for (const ep of entrypoints) {
        content += `- \`${ep.relativePath}\` (${ep.layer}, ${ep.lineCount} lines)\n`;
      }
      content += '\n';
    }

    // Per-domain tables
    for (const domain of domains) {
      content += `## ${domain.name}\n\n`;
      if (domain.ipcPrefix) {
        content += `IPC: \`${domain.ipcPrefix}\`\n\n`;
      }
      content += '| File | Layer | Lines |\n';
      content += '|------|-------|-------|\n';
      for (const file of domain.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
        content += `| \`${file.relativePath}\` | ${file.layer} | ${file.lineCount} |\n`;
      }
      content += '\n';
    }

    return content;
  }

  // ─── File I/O Helpers ────────────────────────────────────────────

  private readExistingFile(projectPath: string, relativePath: string): string | null {
    const fullPath = path.join(projectPath, relativePath);
    try {
      return fs.readFileSync(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  private atomicWrite(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${filePath}.tmp`;
    fs.writeFileSync(tmpFile, content, 'utf-8');
    fs.renameSync(tmpFile, filePath);
  }

  private writeInlineTag(filePath: string, tag: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Remove existing atlas tag if present
    const withoutTag = content.replace(/\/\/\s*@atlas-entrypoint:.*\n?/m, '');

    // Prepend new tag
    const newContent = tag + '\n' + withoutTag;
    this.atomicWrite(filePath, newContent);
  }

  // ─── Utility ─────────────────────────────────────────────────────

  private capitalize(str: string): string {
    if (!str) return str;
    // kebab-case to Title Case
    return str
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
