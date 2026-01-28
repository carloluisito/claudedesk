import { spawn } from 'child_process';
import { Prerequisite, PrerequisiteCheckResult } from '../types.js';

/**
 * Check if a prerequisite command is available and get its version
 */
export async function checkPrerequisite(prerequisite: Prerequisite): Promise<PrerequisiteCheckResult> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(prerequisite.command, prerequisite.args, {
        shell: true,
        timeout: 5000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          // Extract version from output (first line typically)
          const version = (stdout || stderr).split('\n')[0].trim();
          resolve({
            prerequisite,
            installed: true,
            version,
          });
        } else {
          resolve({
            prerequisite,
            installed: false,
            error: `Command exited with code ${code}`,
          });
        }
      });

      proc.on('error', (error) => {
        resolve({
          prerequisite,
          installed: false,
          error: error.message,
        });
      });
    } catch (error) {
      resolve({
        prerequisite,
        installed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

/**
 * Check multiple prerequisites in parallel
 */
export async function checkPrerequisites(prerequisites: Prerequisite[]): Promise<PrerequisiteCheckResult[]> {
  return Promise.all(prerequisites.map(checkPrerequisite));
}
