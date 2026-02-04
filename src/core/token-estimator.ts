import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Content type for token estimation
 */
export type ContentType = 'code' | 'prose' | 'json' | 'mixed';

/**
 * Calibration data structure
 */
interface CalibrationData {
  samples: CalibrationSample[];
  averageRatio: number; // actual/estimated ratio
  lastUpdated: string;
}

interface CalibrationSample {
  estimated: number;
  actual: number;
  ratio: number;
  timestamp: string;
}

/**
 * Token estimation ratios by content type
 * These are baseline ratios that get refined through calibration
 */
const BASE_RATIOS: Record<ContentType, number> = {
  code: 3.2,      // Code is denser (more tokens per char)
  prose: 4.2,     // Prose is less dense
  json: 3.0,      // JSON is very dense
  mixed: 3.7,     // Average for mixed content
};

/**
 * Maximum calibration samples to keep
 */
const MAX_CALIBRATION_SAMPLES = 100;

/**
 * Confidence levels based on calibration sample count
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high';

function getConfidenceLevel(sampleCount: number): ConfidenceLevel {
  if (sampleCount >= 20) return 'high';
  if (sampleCount >= 5) return 'medium';
  return 'low';
}

/**
 * Enhanced token estimator with content-aware ratios and calibration
 */
export class TokenEstimator {
  private calibrationPath: string;
  private calibrationData: CalibrationData;
  private enableCalibration: boolean;

  constructor(enableCalibration: boolean = true) {
    this.enableCalibration = enableCalibration;
    this.calibrationPath = join(process.cwd(), 'config', 'context-calibration.json');
    this.calibrationData = this.loadCalibration();
  }

  /**
   * Load calibration data from disk
   */
  private loadCalibration(): CalibrationData {
    if (!this.enableCalibration) {
      return {
        samples: [],
        averageRatio: 1.0,
        lastUpdated: new Date().toISOString(),
      };
    }

    if (!existsSync(this.calibrationPath)) {
      return this.createDefaultCalibration();
    }

    try {
      const content = readFileSync(this.calibrationPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[TokenEstimator] Failed to load calibration data, using defaults:', error);
      return this.createDefaultCalibration();
    }
  }

  /**
   * Create default calibration data
   */
  private createDefaultCalibration(): CalibrationData {
    const data: CalibrationData = {
      samples: [],
      averageRatio: 1.0,
      lastUpdated: new Date().toISOString(),
    };

    if (this.enableCalibration) {
      this.saveCalibration(data);
    }

    return data;
  }

  /**
   * Save calibration data to disk
   */
  private saveCalibration(data: CalibrationData): void {
    if (!this.enableCalibration) return;

    try {
      const dir = dirname(this.calibrationPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.calibrationPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[TokenEstimator] Failed to save calibration data:', error);
    }
  }

  /**
   * Detect content type based on content patterns
   */
  detectContentType(content: string): ContentType {
    // JSON detection
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) &&
        (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }

    // Code detection - look for common code patterns
    const codePatterns = [
      /^import\s+/m,
      /^export\s+/m,
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/,
      /class\s+\w+/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /=>/,
      /\{\s*$/m,
      /^\s*\/\//m,
      /^\s*\/\*/m,
    ];

    let codeIndicators = 0;
    for (const pattern of codePatterns) {
      if (pattern.test(content)) {
        codeIndicators++;
      }
    }

    // If we have multiple code indicators, likely code
    if (codeIndicators >= 3) {
      return 'code';
    }

    // Check if mostly natural language (prose)
    const words = content.split(/\s+/).length;
    const specialChars = (content.match(/[{}()[\];]/g) || []).length;
    const specialCharRatio = specialChars / content.length;

    if (specialCharRatio < 0.05 && words > 10) {
      return 'prose';
    }

    // Default to mixed
    return 'mixed';
  }

  /**
   * Estimate tokens for content with content-aware ratios
   */
  estimate(content: string, contentType?: ContentType): number {
    const type = contentType || this.detectContentType(content);
    const baseRatio = BASE_RATIOS[type];

    // Apply calibration adjustment
    const calibrationAdjustment = this.enableCalibration && this.calibrationData.samples.length > 0
      ? this.calibrationData.averageRatio
      : 1.0;

    const chars = content.length;
    const estimated = Math.ceil((chars / baseRatio) * calibrationAdjustment);

    return estimated;
  }

  /**
   * Estimate tokens for multiple content pieces
   */
  estimateMultiple(contents: Array<{ content: string; type?: ContentType }>): number {
    return contents.reduce((total, item) => {
      return total + this.estimate(item.content, item.type);
    }, 0);
  }

  /**
   * Record actual token usage to improve calibration
   */
  recordActual(estimated: number, actual: number): void {
    if (!this.enableCalibration || estimated === 0) return;

    const ratio = actual / estimated;

    // Add new sample
    const sample: CalibrationSample = {
      estimated,
      actual,
      ratio,
      timestamp: new Date().toISOString(),
    };

    this.calibrationData.samples.push(sample);

    // Keep only recent samples
    if (this.calibrationData.samples.length > MAX_CALIBRATION_SAMPLES) {
      this.calibrationData.samples = this.calibrationData.samples.slice(-MAX_CALIBRATION_SAMPLES);
    }

    // Recalculate average ratio (weighted toward recent samples)
    const recentSamples = this.calibrationData.samples.slice(-20); // Last 20 samples
    const sum = recentSamples.reduce((acc, s) => acc + s.ratio, 0);
    this.calibrationData.averageRatio = sum / recentSamples.length;

    this.calibrationData.lastUpdated = new Date().toISOString();
    this.saveCalibration(this.calibrationData);

    console.log(`[TokenEstimator] Calibrated: estimated=${estimated}, actual=${actual}, ratio=${ratio.toFixed(3)}, avg=${this.calibrationData.averageRatio.toFixed(3)}`);
  }

  /**
   * Get current estimation accuracy (actual/estimated ratio)
   */
  getEstimationAccuracy(): number {
    if (!this.enableCalibration || this.calibrationData.samples.length === 0) {
      return 1.0;
    }
    return this.calibrationData.averageRatio;
  }

  /**
   * Get confidence level based on calibration data
   */
  getConfidenceLevel(): ConfidenceLevel {
    if (!this.enableCalibration) {
      return 'medium';
    }
    return getConfidenceLevel(this.calibrationData.samples.length);
  }

  /**
   * Get calibration sample count
   */
  getSampleCount(): number {
    return this.calibrationData.samples.length;
  }

  /**
   * Reset calibration data
   */
  resetCalibration(): void {
    this.calibrationData = this.createDefaultCalibration();
    console.log('[TokenEstimator] Calibration data reset');
  }
}

// Singleton instance
let _tokenEstimator: TokenEstimator | null = null;

export function getTokenEstimator(enableCalibration: boolean = true): TokenEstimator {
  if (!_tokenEstimator) {
    _tokenEstimator = new TokenEstimator(enableCalibration);
  }
  return _tokenEstimator;
}
