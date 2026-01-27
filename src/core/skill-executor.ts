import { SkillConfig, SkillExecuteRequest, SkillExecuteResult, RepoConfig } from '../types.js';
import { skillRegistry } from '../config/skills.js';
import { ClaudeInvoker } from './claude-invoker.js';
import { processRunner } from './process-runner.js';

// Create a dedicated ClaudeInvoker instance for skill execution
const claudeInvoker = new ClaudeInvoker();

export interface SkillExecutionContext {
  repo: RepoConfig;
  inputs: Record<string, string | number | boolean>;
  job?: { id: string; branch: string };
  diff?: string;
  changedFiles?: string[];
}

export class SkillExecutor {
  // Interpolate template variables in skill content
  private interpolate(template: string, context: SkillExecutionContext): string {
    return template
      .replace(/\{\{repo\.id\}\}/g, context.repo.id)
      .replace(/\{\{repo\.path\}\}/g, context.repo.path)
      .replace(/\{\{job\.id\}\}/g, context.job?.id || '')
      .replace(/\{\{job\.branch\}\}/g, context.job?.branch || '')
      .replace(/\{\{context\.diff\}\}/g, context.diff || '')
      .replace(/\{\{context\.changedFiles\}\}/g, (context.changedFiles || []).join('\n'))
      .replace(/\{\{inputs\.(\w+)\}\}/g, (_, key) => String(context.inputs[key] ?? ''));
  }

  // Validate and fill default inputs
  private resolveInputs(
    skill: SkillConfig,
    providedInputs: Record<string, string | number | boolean> = {}
  ): Record<string, string | number | boolean> {
    const resolved: Record<string, string | number | boolean> = {};

    for (const input of skill.inputs) {
      if (providedInputs[input.name] !== undefined) {
        resolved[input.name] = providedInputs[input.name];
      } else if (input.default !== undefined) {
        resolved[input.name] = input.default;
      } else if (input.required) {
        throw new Error(`Missing required input: ${input.name}`);
      }
    }

    return resolved;
  }

  // Execute a prompt-based skill
  private async executePromptSkill(
    skill: SkillConfig,
    context: SkillExecutionContext,
    workingDir: string,
    artifactsDir: string
  ): Promise<SkillExecuteResult> {
    if (!skill.promptContent) {
      return { success: false, error: 'Skill has no prompt content' };
    }

    const prompt = this.interpolate(skill.promptContent, context);

    console.log(`[SkillExecutor] Executing prompt skill: ${skill.id}`);

    const result = await claudeInvoker.invoke({
      repoPath: workingDir,
      prompt,
      artifactsDir,
    });

    return {
      success: result.success,
      output: result.output,
      error: result.error,
    };
  }

  // Execute a command-based skill
  private async executeCommandSkill(
    skill: SkillConfig,
    context: SkillExecutionContext,
    workingDir: string
  ): Promise<SkillExecuteResult> {
    if (!skill.command) {
      return { success: false, error: 'No command defined for skill' };
    }

    const command = this.interpolate(skill.command.run, context);
    const cwd = skill.command.cwd
      ? this.interpolate(skill.command.cwd, context)
      : workingDir;

    console.log(`[SkillExecutor] Executing command skill: ${skill.id} - ${command}`);

    const result = await processRunner.run(command, {
      cwd,
      timeout: skill.command.timeout || 120000,
      env: skill.command.env,
    });

    return {
      success: result.exitCode === 0,
      output: result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : ''),
      error: result.exitCode !== 0 ? (result.error || result.stderr || `Exit code: ${result.exitCode}`) : undefined,
    };
  }

  // Execute a workflow-based skill
  private async executeWorkflowSkill(
    skill: SkillConfig,
    context: SkillExecutionContext,
    workingDir: string,
    artifactsDir: string
  ): Promise<SkillExecuteResult> {
    if (!skill.workflow?.steps || skill.workflow.steps.length === 0) {
      return { success: false, error: 'No workflow steps defined' };
    }

    console.log(`[SkillExecutor] Executing workflow skill: ${skill.id} with ${skill.workflow.steps.length} steps`);

    const outputs: string[] = [];

    for (let i = 0; i < skill.workflow.steps.length; i++) {
      const step = skill.workflow.steps[i];
      console.log(`[SkillExecutor] Running workflow step ${i + 1}/${skill.workflow.steps.length}`);

      let stepResult: SkillExecuteResult;

      if (step.skill) {
        // Execute referenced skill
        const refSkill = skillRegistry.get(step.skill, context.repo.id);
        if (!refSkill) {
          return { success: false, error: `Referenced skill not found: ${step.skill}` };
        }
        stepResult = await this.executeSkill(refSkill, context, workingDir, artifactsDir);
      } else if (step.prompt) {
        // Inline prompt - invoke Claude directly
        const prompt = this.interpolate(step.prompt, context);
        const result = await claudeInvoker.invoke({
          repoPath: workingDir,
          prompt,
          artifactsDir,
        });
        stepResult = { success: result.success, output: result.output, error: result.error };
      } else if (step.command) {
        // Inline command
        const command = this.interpolate(step.command, context);
        const result = await processRunner.run(command, { cwd: workingDir });
        stepResult = {
          success: result.exitCode === 0,
          output: result.stdout,
          error: result.exitCode !== 0 ? (result.error || result.stderr) : undefined,
        };
      } else {
        console.log(`[SkillExecutor] Skipping empty step ${i + 1}`);
        continue;
      }

      if (!stepResult.success) {
        return {
          success: false,
          output: outputs.join('\n---\n'),
          error: `Step ${i + 1} failed: ${stepResult.error}`,
        };
      }

      if (stepResult.output) {
        outputs.push(stepResult.output);
      }
    }

    return {
      success: true,
      output: outputs.join('\n---\n'),
    };
  }

  // Execute a skill based on its type
  private async executeSkill(
    skill: SkillConfig,
    context: SkillExecutionContext,
    workingDir: string,
    artifactsDir: string
  ): Promise<SkillExecuteResult> {
    switch (skill.type) {
      case 'prompt':
        return this.executePromptSkill(skill, context, workingDir, artifactsDir);
      case 'command':
        return this.executeCommandSkill(skill, context, workingDir);
      case 'workflow':
        return this.executeWorkflowSkill(skill, context, workingDir, artifactsDir);
      default:
        return { success: false, error: `Unknown skill type: ${skill.type}` };
    }
  }

  // Main execution entry point
  async execute(
    request: SkillExecuteRequest,
    repo: RepoConfig,
    workingDir: string,
    artifactsDir: string,
    jobContext?: { id: string; branch: string }
  ): Promise<SkillExecuteResult> {
    // Load repo skills if not already cached
    skillRegistry.loadRepoSkills(repo.id, repo.path);

    const skill = skillRegistry.get(request.skillId, request.repoId);
    if (!skill) {
      return { success: false, error: `Skill not found: ${request.skillId}` };
    }

    console.log(`[SkillExecutor] Executing skill: ${skill.id} (${skill.type}) from ${skill.source}`);

    // Resolve inputs with defaults
    let inputs: Record<string, string | number | boolean>;
    try {
      inputs = this.resolveInputs(skill, request.inputs);
    } catch (error) {
      return { success: false, error: String(error) };
    }

    const context: SkillExecutionContext = {
      repo,
      inputs,
      job: jobContext,
    };

    return this.executeSkill(skill, context, workingDir, artifactsDir);
  }
}

export const skillExecutor = new SkillExecutor();
