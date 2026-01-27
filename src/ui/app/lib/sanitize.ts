/**
 * SEC-03: Token Sanitization
 *
 * Sanitizes sensitive data like API keys, tokens, and credentials from text
 * before displaying in UI to prevent accidental exposure.
 */

const REDACTED = '***REDACTED***';

/**
 * Patterns for sensitive data that should be masked
 */
const SENSITIVE_PATTERNS = [
  // Anthropic API keys
  /sk-ant-[a-zA-Z0-9-_]{95,}/g,

  // OpenAI API keys
  /sk-[a-zA-Z0-9]{48}/g,

  // GitHub tokens
  /ghp_[a-zA-Z0-9]{36}/g,  // Personal access token
  /gho_[a-zA-Z0-9]{36}/g,  // OAuth access token
  /ghs_[a-zA-Z0-9]{36}/g,  // Server-to-server token
  /github_pat_[a-zA-Z0-9_]{82}/g, // Fine-grained personal access token

  // GitLab tokens
  /glpat-[a-zA-Z0-9_-]{20}/g,

  // AWS access keys
  /AKIA[0-9A-Z]{16}/g,

  // AWS secret keys (40 chars base64)
  /[A-Za-z0-9/+=]{40}/g,

  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,

  // Generic API key patterns (case insensitive)
  /['"]?api[_-]?key['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,
  /['"]?apikey['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,
  /['"]?api[_-]?secret['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,
  /['"]?access[_-]?token['"]?\s*[=:]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,

  // Generic token= patterns
  /token=[a-zA-Z0-9_\-]{16,}/gi,

  // Base64 encoded tokens (longer than 32 chars, could be credentials)
  /[A-Za-z0-9+/]{32,}={0,2}/g,
];

/**
 * Sanitize sensitive data from text by replacing it with REDACTED markers
 *
 * @param text - The text to sanitize
 * @returns Sanitized text with sensitive data replaced
 */
export function sanitizeSensitiveData(text: string | null | undefined): string {
  if (!text) return '';

  let sanitized = text;

  // Apply all patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, REDACTED);
  }

  return sanitized;
}

/**
 * Check if text contains potentially sensitive data
 *
 * @param text - The text to check
 * @returns true if sensitive patterns are detected
 */
export function containsSensitiveData(text: string | null | undefined): boolean {
  if (!text) return false;

  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}
