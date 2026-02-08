import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, FileReadResult } from '../shared/ipc-types';
import {
  getFileCategory,
  isBinaryFile,
  getMimeType,
  isLocalFile,
  sanitizeFilePath,
} from './file-utils';

/**
 * Get file information for drag-dropped files
 */
export async function getFileInfo(filePaths: string[]): Promise<FileInfo[]> {
  const results: FileInfo[] = [];

  for (const filePath of filePaths) {
    try {
      // Security: validate local file
      if (!isLocalFile(filePath)) {
        console.warn('Rejecting non-local file:', filePath);
        continue;
      }

      const sanitizedPath = sanitizeFilePath(filePath);

      // Check if file exists
      if (!fs.existsSync(sanitizedPath)) {
        console.warn('File does not exist:', sanitizedPath);
        continue;
      }

      // Check if it's a file (not directory)
      const stats = fs.statSync(sanitizedPath);
      if (!stats.isFile()) {
        console.warn('Path is not a file:', sanitizedPath);
        continue;
      }

      const name = path.basename(sanitizedPath);
      const extension = path.extname(sanitizedPath);
      const category = getFileCategory(sanitizedPath);
      const isBinary = isBinaryFile(sanitizedPath);
      const mimeType = getMimeType(sanitizedPath);

      results.push({
        path: sanitizedPath,
        name,
        extension,
        sizeBytes: stats.size,
        category,
        isBinary,
        mimeType,
      });
    } catch (err) {
      console.error('Error getting file info for', filePath, ':', err);
      // Skip files that cause errors
    }
  }

  return results;
}

/**
 * Read file content with size limit
 */
export async function readFileContent(
  filePath: string,
  maxSizeKB: number
): Promise<FileReadResult> {
  try {
    // Security: validate local file
    if (!isLocalFile(filePath)) {
      throw new Error('Cannot read non-local files');
    }

    const sanitizedPath = sanitizeFilePath(filePath);

    // Check if file exists
    if (!fs.existsSync(sanitizedPath)) {
      throw new Error('File does not exist');
    }

    const stats = fs.statSync(sanitizedPath);

    // Check if it's a file
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    // Check if binary
    if (isBinaryFile(sanitizedPath)) {
      throw new Error('Cannot read binary file content');
    }

    const maxSizeBytes = maxSizeKB * 1024;
    const truncated = stats.size > maxSizeBytes;

    // Read file with size limit
    let content: string;
    if (truncated) {
      const buffer = Buffer.alloc(maxSizeBytes);
      const fd = fs.openSync(sanitizedPath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, maxSizeBytes, 0);
      fs.closeSync(fd);
      content = buffer.toString('utf-8', 0, bytesRead);
    } else {
      content = fs.readFileSync(sanitizedPath, 'utf-8');
    }

    // Sanitize content: remove null bytes
    content = content.replace(/\0/g, '');

    return {
      content,
      truncated,
    };
  } catch (err) {
    console.error('Error reading file content:', err);
    throw err;
  }
}

/**
 * Format file path for terminal insertion
 */
export function formatPathForTerminal(
  filePath: string,
  format: 'quoted' | 'unquoted' | 'escaped'
): string {
  const isWindows = process.platform === 'win32';

  // Normalize path separators for platform
  let formatted = isWindows
    ? filePath.replace(/\//g, '\\')
    : filePath.replace(/\\/g, '/');

  switch (format) {
    case 'quoted':
      // Quote paths with spaces or special characters
      if (formatted.includes(' ') || formatted.includes('(') || formatted.includes(')')) {
        formatted = `"${formatted}"`;
      }
      break;

    case 'escaped':
      // Escape spaces and special characters
      formatted = formatted
        .replace(/ /g, '\\ ')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/&/g, '\\&')
        .replace(/\$/g, '\\$');
      break;

    case 'unquoted':
    default:
      // No transformation
      break;
  }

  return formatted;
}
