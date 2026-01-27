import { randomInt, timingSafeEqual } from 'crypto';

export interface PairingPin {
  pin: string;              // 6-digit PIN
  token: string;            // The auth token to return on validation
  createdAt: number;        // Unix timestamp
  expiresAt: number;        // Unix timestamp (createdAt + 5 minutes)
  attempts: number;         // Failed validation attempts (max 5)
}

// PIN expiration time: 5 minutes
const PIN_EXPIRATION_MS = 5 * 60 * 1000;

// Max failed attempts per PIN
const MAX_PIN_ATTEMPTS = 5;

// Rate limiting: track validation attempts per IP
const PIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_IP = 10;

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

class PinAuthManager {
  private activePin: PairingPin | null = null;
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup of expired PINs and rate limit entries
    this.startCleanup();
  }

  /**
   * Generate a cryptographically secure 6-digit PIN
   */
  private generatePin(): string {
    // Generate random number between 0 and 999999
    const num = randomInt(0, 1000000);
    // Pad with zeros to ensure 6 digits
    return num.toString().padStart(6, '0');
  }

  /**
   * Generate a new pairing PIN
   * Invalidates any existing PIN
   */
  generatePairingPin(authToken: string): { pin: string; expiresAt: number; expiresInSeconds: number } {
    const pin = this.generatePin();
    const now = Date.now();
    const expiresAt = now + PIN_EXPIRATION_MS;

    this.activePin = {
      pin,
      token: authToken,
      createdAt: now,
      expiresAt,
      attempts: 0,
    };

    console.log('[PinAuth] Generated new pairing PIN (expires in 5 minutes)');

    return {
      pin,
      expiresAt,
      expiresInSeconds: Math.floor(PIN_EXPIRATION_MS / 1000),
    };
  }

  /**
   * Get status of active PIN
   */
  getPinStatus(): { hasActivePin: boolean; expiresAt?: number; expiresInSeconds?: number } {
    if (!this.activePin) {
      return { hasActivePin: false };
    }

    // Check if expired
    if (Date.now() >= this.activePin.expiresAt) {
      this.activePin = null;
      return { hasActivePin: false };
    }

    const expiresInMs = this.activePin.expiresAt - Date.now();
    return {
      hasActivePin: true,
      expiresAt: this.activePin.expiresAt,
      expiresInSeconds: Math.floor(expiresInMs / 1000),
    };
  }

  /**
   * Invalidate the current PIN
   */
  invalidatePin(): boolean {
    if (this.activePin) {
      this.activePin = null;
      console.log('[PinAuth] PIN invalidated');
      return true;
    }
    return false;
  }

  /**
   * Check rate limiting for IP
   */
  checkRateLimit(ip: string): { allowed: boolean; attemptsRemaining?: number } {
    const entry = this.rateLimitMap.get(ip);
    const now = Date.now();

    if (!entry) {
      // First attempt, allow and create entry
      this.rateLimitMap.set(ip, { attempts: 1, windowStart: now });
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS_PER_IP - 1 };
    }

    // Check if window expired
    if (now - entry.windowStart > PIN_RATE_LIMIT_WINDOW_MS) {
      // Reset window
      this.rateLimitMap.set(ip, { attempts: 1, windowStart: now });
      return { allowed: true, attemptsRemaining: MAX_ATTEMPTS_PER_IP - 1 };
    }

    // Check if limit reached
    if (entry.attempts >= MAX_ATTEMPTS_PER_IP) {
      const timeRemaining = Math.ceil((entry.windowStart + PIN_RATE_LIMIT_WINDOW_MS - now) / 1000);
      console.warn(`[PinAuth] Rate limit exceeded for IP ${ip} (${timeRemaining}s remaining)`);
      return { allowed: false };
    }

    // Increment attempts
    entry.attempts++;
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS_PER_IP - entry.attempts };
  }

  /**
   * Validate a PIN with constant-time comparison
   */
  validatePin(
    pin: string,
    clientIp: string
  ): {
    success: boolean;
    token?: string;
    error?: string;
    attemptsRemaining?: number;
  } {
    // Check rate limiting first
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: 'Too many validation attempts. Please try again later.',
      };
    }

    // Validate PIN format (must be exactly 6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return {
        success: false,
        error: 'Invalid PIN format. Must be 6 digits.',
        attemptsRemaining: rateLimit.attemptsRemaining,
      };
    }

    // Check if there's an active PIN
    if (!this.activePin) {
      return {
        success: false,
        error: 'No active pairing PIN. Please generate a new PIN from the desktop.',
        attemptsRemaining: rateLimit.attemptsRemaining,
      };
    }

    // Check if expired
    if (Date.now() >= this.activePin.expiresAt) {
      this.activePin = null;
      return {
        success: false,
        error: 'PIN has expired. Please generate a new PIN.',
        attemptsRemaining: rateLimit.attemptsRemaining,
      };
    }

    // Check if max attempts reached for this PIN
    if (this.activePin.attempts >= MAX_PIN_ATTEMPTS) {
      const attemptsRemaining = 0;
      this.activePin = null;
      console.warn('[PinAuth] PIN invalidated due to max attempts');
      return {
        success: false,
        error: 'Maximum attempts exceeded. Please generate a new PIN.',
        attemptsRemaining,
      };
    }

    // Constant-time comparison
    const providedBuffer = Buffer.from(pin, 'utf-8');
    const expectedBuffer = Buffer.from(this.activePin.pin, 'utf-8');

    let isValid = false;
    try {
      // timingSafeEqual requires buffers of same length
      if (providedBuffer.length === expectedBuffer.length) {
        isValid = timingSafeEqual(providedBuffer, expectedBuffer);
      }
    } catch (error) {
      isValid = false;
    }

    if (!isValid) {
      // Increment attempts
      this.activePin.attempts++;
      const pinAttemptsRemaining = MAX_PIN_ATTEMPTS - this.activePin.attempts;

      console.warn(
        `[PinAuth] Invalid PIN attempt from ${clientIp} (${pinAttemptsRemaining} attempts remaining for this PIN)`
      );

      return {
        success: false,
        error: 'Invalid PIN. Please try again.',
        attemptsRemaining: pinAttemptsRemaining,
      };
    }

    // Success - return token and delete PIN (single-use)
    const token = this.activePin.token;
    this.activePin = null;
    console.log('[PinAuth] PIN validated successfully');

    return {
      success: true,
      token,
    };
  }

  /**
   * Start periodic cleanup of expired data
   */
  private startCleanup(): void {
    // Run cleanup every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      // Clean expired PIN
      if (this.activePin && now >= this.activePin.expiresAt) {
        console.log('[PinAuth] Cleaned up expired PIN');
        this.activePin = null;
      }

      // Clean expired rate limit entries
      for (const [ip, entry] of this.rateLimitMap.entries()) {
        if (now - entry.windowStart > PIN_RATE_LIMIT_WINDOW_MS) {
          this.rateLimitMap.delete(ip);
        }
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const pinAuthManager = new PinAuthManager();
