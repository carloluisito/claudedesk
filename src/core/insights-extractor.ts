import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { JobInsights } from '../types.js';

/**
 * Extracts insights from Claude's output to explain what was done and why.
 * Parses the conversational output and structures it into actionable insights.
 */
export class InsightsExtractor {
  /**
   * Extract insights from a job's Claude output
   */
  extractFromJob(artifactsDir: string, changedFiles?: string[]): JobInsights | null {
    const claudeOutputPath = join(artifactsDir, 'claude', 'output.txt');
    const promptPath = join(artifactsDir, 'claude', 'prompt.md');

    if (!existsSync(claudeOutputPath)) {
      console.log('[InsightsExtractor] No Claude output found');
      return null;
    }

    const output = readFileSync(claudeOutputPath, 'utf-8');
    const prompt = existsSync(promptPath) ? readFileSync(promptPath, 'utf-8') : '';

    if (!output || output.trim().length === 0) {
      console.log('[InsightsExtractor] Claude output is empty');
      return null;
    }

    console.log(`[InsightsExtractor] Extracting insights from ${output.length} chars of output`);

    const insights = this.parseOutput(output, prompt, changedFiles || []);

    // Save insights to file
    const insightsPath = join(artifactsDir, 'insights.json');
    writeFileSync(insightsPath, JSON.stringify(insights, null, 2));
    console.log(`[InsightsExtractor] Saved insights to ${insightsPath}`);

    return insights;
  }

  /**
   * Extract insights from a create-repo workflow (scaffolded projects)
   */
  extractFromCreateRepo(artifactsDir: string, params?: Record<string, string>): JobInsights | null {
    const claudeOutputPath = join(artifactsDir, 'claude', 'output.txt');

    if (!existsSync(claudeOutputPath)) {
      console.log('[InsightsExtractor] No Claude output found for create-repo');
      return null;
    }

    const output = readFileSync(claudeOutputPath, 'utf-8');

    if (!output || output.trim().length === 0) {
      console.log('[InsightsExtractor] Claude output is empty');
      return null;
    }

    console.log(`[InsightsExtractor] Extracting creation insights from ${output.length} chars of output`);

    const templateId = params?.templateId || 'unknown';
    const repoName = params?.repoName || 'new project';
    const featureDescription = params?.featureDescription || params?.prompt || '';

    const insights: JobInsights = {
      summary: `Created ${repoName} using ${templateId} template`,
      problem: featureDescription || `Scaffold a new ${templateId} project`,
      solution: this.extractCreationSolution(output, templateId),
      reasoning: this.extractCreationReasoning(output, templateId),
      filesChanged: this.extractCreatedFiles(output),
      patterns: ['Project scaffolding', 'Template-based setup'],
    };

    // Save insights to file
    const insightsPath = join(artifactsDir, 'insights.json');
    writeFileSync(insightsPath, JSON.stringify(insights, null, 2));
    console.log(`[InsightsExtractor] Saved creation insights to ${insightsPath}`);

    return insights;
  }

  /**
   * Extract what was created in a scaffolded project
   */
  private extractCreationSolution(output: string, templateId: string): string[] {
    const solutions: string[] = [];

    // Look for file creation patterns
    const filePatterns = [
      /(?:created?|wrote?|generated?|added?)\s+(?:file\s+)?[`']?([^\s`']+\.[a-z]+)[`']?/gi,
      /(?:setting up|configured?|initialized?)\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const item = match[1].trim();
        if (item.length > 3 && item.length < 100 && !solutions.includes(item)) {
          solutions.push(`Created ${item}`);
        }
      }
    }

    // Add template-specific defaults if nothing found
    if (solutions.length === 0) {
      const templateDefaults: Record<string, string[]> = {
        'nextjs-web': [
          'Set up Next.js project structure',
          'Configured TypeScript',
          'Added Tailwind CSS styling',
          'Created initial page components',
        ],
        'default': [
          'Scaffolded project structure',
          'Created configuration files',
          'Set up development environment',
        ],
      };
      return templateDefaults[templateId] || templateDefaults['default'];
    }

    return solutions.slice(0, 5);
  }

  /**
   * Extract reasoning for architectural decisions in scaffolded project
   */
  private extractCreationReasoning(output: string, templateId: string): string {
    // Look for reasoning patterns
    const reasoningPatterns = [
      /(?:because|since|to)\s+(.+?)(?:\.|$)/gi,
      /(?:this|the)\s+(?:template|setup|structure)\s+(?:provides?|enables?|allows?)\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of reasoningPatterns) {
      const match = output.match(pattern);
      if (match) {
        const reason = match[1].trim();
        if (reason.length > 20 && reason.length < 200) {
          return this.capitalizeFirst(reason);
        }
      }
    }

    // Template-specific default reasoning
    const defaultReasoning: Record<string, string> = {
      'nextjs-web': 'Next.js provides server-side rendering, file-based routing, and excellent TypeScript support for modern web applications',
      'default': 'Template provides a solid foundation with best practices and common configurations pre-configured',
    };

    return defaultReasoning[templateId] || defaultReasoning['default'];
  }

  /**
   * Extract list of created files from output
   */
  private extractCreatedFiles(output: string): { path: string; changes: string }[] {
    const files: { path: string; changes: string }[] = [];

    // Look for file paths in output
    const filePattern = /(?:created?|wrote?|generated?)\s+[`']?([^\s`']+\.[a-z]+)[`']?/gi;
    let match;

    while ((match = filePattern.exec(output)) !== null) {
      const filePath = match[1];
      if (!files.find(f => f.path === filePath)) {
        files.push({
          path: filePath,
          changes: this.generateFileChangeDescription(filePath),
        });
      }
    }

    return files.slice(0, 10);
  }

  /**
   * Parse Claude's output and extract structured insights
   */
  private parseOutput(output: string, prompt: string, changedFiles: string[]): JobInsights {
    // Extract problem from prompt
    const problem = this.extractProblem(prompt, output);

    // Extract what was done
    const solution = this.extractSolution(output);

    // Extract reasoning
    const reasoning = this.extractReasoning(output);

    // Generate summary
    const summary = this.generateSummary(problem, solution);

    // Extract per-file changes
    const filesChanged = this.extractFileChanges(output, changedFiles);

    // Identify patterns
    const patterns = this.identifyPatterns(output, problem);

    // Generate prevention tips
    const preventionTips = this.generatePreventionTips(patterns, problem);

    return {
      summary,
      problem,
      solution,
      reasoning,
      filesChanged,
      patterns: patterns.length > 0 ? patterns : undefined,
      preventionTips: preventionTips.length > 0 ? preventionTips : undefined,
    };
  }

  /**
   * Extract the problem description from prompt and output
   */
  private extractProblem(prompt: string, output: string): string {
    // Try to extract from prompt first
    const promptMatch = prompt.match(/## Failed Step Output[\s\S]*?```([\s\S]*?)```/);
    if (promptMatch) {
      const errorLog = promptMatch[1].trim();
      // Extract first meaningful error line
      const errorLines = errorLog.split('\n').filter(line =>
        line.includes('error') ||
        line.includes('Error') ||
        line.includes('failed') ||
        line.includes('Failed') ||
        line.includes('TypeError') ||
        line.includes('ReferenceError') ||
        line.includes('SyntaxError')
      );
      if (errorLines.length > 0) {
        return this.cleanErrorMessage(errorLines[0]);
      }
    }

    // Try to extract from Claude's analysis in output
    const analysisPatterns = [
      /(?:the (?:issue|problem|error|bug) (?:is|was))\s+(.+?)(?:\.|$)/i,
      /(?:found|identified|discovered)\s+(?:a|an|the)?\s*(.+?)(?:error|issue|problem|bug)(.+?)(?:\.|$)/i,
      /(?:this|the)\s+(?:error|issue|problem|bug)\s+(?:is|was)\s+(?:caused by|due to)\s+(.+?)(?:\.|$)/i,
    ];

    for (const pattern of analysisPatterns) {
      const match = output.match(pattern);
      if (match) {
        return this.cleanErrorMessage(match[1] + (match[2] || ''));
      }
    }

    return 'Issue identified and resolved by Claude';
  }

  /**
   * Extract what Claude did to fix the issue
   */
  private extractSolution(output: string): string[] {
    const solutions: string[] = [];

    // Look for explicit "I did X" or "Fixed by" patterns
    const actionPatterns = [
      /(?:I |I've |I have )?(added|created|updated|modified|fixed|changed|removed|replaced|implemented|refactored)\s+(.+?)(?:\.|$)/gi,
      /(?:by |through )(adding|creating|updating|modifying|fixing|changing|removing|replacing|implementing)\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const action = match[1].toLowerCase();
        const target = match[2].trim();
        if (target.length > 5 && target.length < 150) {
          solutions.push(`${this.capitalizeFirst(action)} ${target}`);
        }
      }
    }

    // Look for bullet-point style lists
    const bulletMatches = output.match(/^[\s]*[-•*]\s+(.+?)$/gm);
    if (bulletMatches) {
      for (const bullet of bulletMatches) {
        const text = bullet.replace(/^[\s]*[-•*]\s+/, '').trim();
        if (text.length > 10 && text.length < 150 && !solutions.includes(text)) {
          solutions.push(text);
        }
      }
    }

    // Deduplicate and limit
    const uniqueSolutions = [...new Set(solutions)].slice(0, 5);

    if (uniqueSolutions.length === 0) {
      return ['Applied fixes based on error analysis'];
    }

    return uniqueSolutions;
  }

  /**
   * Extract reasoning for why this approach was chosen
   */
  private extractReasoning(output: string): string {
    const reasoningPatterns = [
      /(?:because|since|as)\s+(.+?)(?:\.|$)/gi,
      /(?:this approach|this solution|this fix)\s+(?:is|was)\s+(?:chosen|used|preferred)\s+(?:because|since|as)\s+(.+?)(?:\.|$)/gi,
      /(?:the reason|reasoning)\s+(?:is|was|for this)\s+(.+?)(?:\.|$)/gi,
      /(?:I chose|I decided|I opted)\s+(?:to|for)\s+(.+?)\s+(?:because|since|as)\s+(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of reasoningPatterns) {
      const match = output.match(pattern);
      if (match) {
        const reason = (match[1] + (match[2] || '')).trim();
        if (reason.length > 20 && reason.length < 300) {
          return this.capitalizeFirst(reason);
        }
      }
    }

    return 'Minimal changes applied to fix the identified issue while preserving existing functionality';
  }

  /**
   * Extract per-file change explanations
   */
  private extractFileChanges(output: string, changedFiles: string[]): { path: string; changes: string }[] {
    const fileChanges: { path: string; changes: string }[] = [];

    for (const file of changedFiles) {
      const fileName = file.split('/').pop() || file;
      const filePattern = new RegExp(
        `(?:in|to|for|modified|updated|changed|edited)\\s+[\`']?${this.escapeRegex(fileName)}[\`']?[^.]*?(?:to|by|:)?\\s*([^.]+)`,
        'i'
      );

      const match = output.match(filePattern);
      if (match) {
        fileChanges.push({
          path: file,
          changes: this.capitalizeFirst(match[1].trim()),
        });
      } else {
        // Generate generic description based on file type
        fileChanges.push({
          path: file,
          changes: this.generateFileChangeDescription(file),
        });
      }
    }

    return fileChanges;
  }

  /**
   * Identify common patterns/issues from the output
   */
  private identifyPatterns(output: string, problem: string): string[] {
    const patterns: string[] = [];
    const combined = (output + ' ' + problem).toLowerCase();

    const patternKeywords: Record<string, string> = {
      'null': 'Null/undefined check',
      'undefined': 'Null/undefined check',
      'type error': 'Type mismatch',
      'typeerror': 'Type mismatch',
      'missing import': 'Missing import',
      'import': 'Import issue',
      'async': 'Async/await handling',
      'await': 'Async/await handling',
      'race condition': 'Race condition',
      'timeout': 'Timeout handling',
      'memory': 'Memory management',
      'syntax': 'Syntax error',
      'lint': 'Linting issue',
      'deprecated': 'Deprecated API usage',
      'version': 'Version compatibility',
      'dependency': 'Dependency issue',
      'circular': 'Circular dependency',
      'permission': 'Permission issue',
      'authentication': 'Authentication issue',
      'authorization': 'Authorization issue',
    };

    for (const [keyword, pattern] of Object.entries(patternKeywords)) {
      if (combined.includes(keyword) && !patterns.includes(pattern)) {
        patterns.push(pattern);
      }
    }

    return patterns.slice(0, 3);
  }

  /**
   * Generate prevention tips based on identified patterns
   */
  private generatePreventionTips(patterns: string[], problem: string): string[] {
    const tips: string[] = [];

    const tipMap: Record<string, string> = {
      'Null/undefined check': 'Use optional chaining (?.) and nullish coalescing (??) operators for safer property access',
      'Type mismatch': 'Enable strict TypeScript mode and add explicit type annotations',
      'Missing import': 'Configure your IDE to auto-import and catch missing imports at lint time',
      'Import issue': 'Organize imports consistently and use absolute imports where possible',
      'Async/await handling': 'Always handle promise rejections with try/catch or .catch()',
      'Race condition': 'Use proper synchronization mechanisms or sequential execution for dependent operations',
      'Timeout handling': 'Implement retry logic with exponential backoff for network operations',
      'Memory management': 'Clean up subscriptions and event listeners in component unmount/cleanup',
      'Syntax error': 'Enable auto-formatting and lint-on-save in your editor',
      'Linting issue': 'Run linter as part of your pre-commit hooks',
      'Deprecated API usage': 'Keep dependencies up to date and monitor deprecation warnings',
      'Version compatibility': 'Pin dependency versions and test upgrades in isolation',
      'Dependency issue': 'Regularly audit and update dependencies with npm audit',
      'Circular dependency': 'Use dependency injection or restructure modules to break cycles',
      'Permission issue': 'Implement proper role-based access control from the start',
      'Authentication issue': 'Use established auth libraries and follow security best practices',
      'Authorization issue': 'Implement authorization checks at both API and UI layers',
    };

    for (const pattern of patterns) {
      if (tipMap[pattern]) {
        tips.push(tipMap[pattern]);
      }
    }

    return tips.slice(0, 2);
  }

  /**
   * Generate a one-line summary
   */
  private generateSummary(problem: string, solution: string[]): string {
    if (solution.length > 0) {
      return `${solution[0]} to resolve: ${problem.slice(0, 80)}${problem.length > 80 ? '...' : ''}`;
    }
    return `Resolved: ${problem.slice(0, 100)}${problem.length > 100 ? '...' : ''}`;
  }

  /**
   * Generate generic file change description based on file type
   */
  private generateFileChangeDescription(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const descriptions: Record<string, string> = {
      'ts': 'Updated TypeScript code',
      'tsx': 'Updated React component',
      'js': 'Updated JavaScript code',
      'jsx': 'Updated React component',
      'json': 'Updated configuration',
      'css': 'Updated styles',
      'scss': 'Updated styles',
      'html': 'Updated markup',
      'md': 'Updated documentation',
      'yml': 'Updated configuration',
      'yaml': 'Updated configuration',
    };
    return descriptions[ext || ''] || 'Modified file';
  }

  // Utility functions
  private cleanErrorMessage(msg: string): string {
    return msg
      .replace(/^\s*(?:error|Error|ERROR):\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

export const insightsExtractor = new InsightsExtractor();
