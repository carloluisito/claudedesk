import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { hostname, platform, homedir } from 'os';

/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-GCM with machine-specific key derivation
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive a machine-specific encryption key
 * Based on hostname + platform + homedir
 */
function deriveMachineKey(): Buffer {
  const machineId = `${hostname()}-${platform()}-${homedir()}`;
  return createHash('sha256').update(machineId).digest();
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encryptedText: string;  // Base64 encoded
  iv: string;             // Base64 encoded
  tag: string;            // Base64 encoded (auth tag)
}

/**
 * Encrypt a string using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): EncryptedData {
  const key = deriveMachineKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const tag = cipher.getAuthTag();

  return {
    encryptedText: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt a string using AES-256-GCM
 * @param data - Encrypted data with IV and auth tag
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(data: EncryptedData): string {
  const key = deriveMachineKey();
  const iv = Buffer.from(data.iv, 'base64');
  const tag = Buffer.from(data.tag, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if encrypted data is empty/unset
 */
export function isEncryptedDataEmpty(data: { encryptedToken: string; iv: string; tag: string }): boolean {
  return !data.encryptedToken || !data.iv || !data.tag;
}
