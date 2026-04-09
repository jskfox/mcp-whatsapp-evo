/**
 * Input Sanitizer
 * Sanitizes webhook payloads to prevent injection attacks
 */

// ============================================================================
// Injection Patterns
// ============================================================================

const DANGEROUS_PATTERNS = [
  // HTML/Script injection
  { pattern: /<script[^>]*>.*?<\/script>/gi, replacement: '[script removed]' },
  { pattern: /<iframe[^>]*>.*?<\/iframe>/gi, replacement: '[iframe removed]' },
  { pattern: /javascript:/gi, replacement: '[js removed]' },
  { pattern: /on\w+\s*=/gi, replacement: '[event removed]' }, // onclick, onload, etc.

  // Command injection (for any future shell usage)
  { pattern: /[;&|`$]/g, replacement: '_' },

  // SQL injection patterns (defense in depth)
  { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi, replacement: '[sql removed]' },

  // Path traversal
  { pattern: /(\.\.\/|\.\.\\|%2e%2e)/gi, replacement: '[path removed]' },
] as const;

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /** Remove HTML tags entirely (default: true) */
  stripHtml?: boolean;
  /** Maximum text length (default: 4096) */
  maxLength?: number;
  /** Trim whitespace (default: true) */
  trim?: boolean;
}

/**
 * Sanitized result
 */
export interface SanitizedResult<T = string> {
  value: T;
  sanitized: boolean;
  removedPatterns: string[];
}

// ============================================================================
// Sanitizer
// ============================================================================

export class Sanitizer {
  private readonly options: Required<SanitizeOptions>;

  constructor(options: SanitizeOptions = {}) {
    this.options = {
      stripHtml: options.stripHtml ?? true,
      maxLength: options.maxLength ?? 4096,
      trim: options.trim ?? true,
    };
  }

  /**
   * Sanitize a string input
   */
  sanitize(input: string): SanitizedResult<string> {
    if (typeof input !== 'string') {
      return {
        value: '',
        sanitized: false,
        removedPatterns: [],
      };
    }

    const removedPatterns: string[] = [];
    let value = input;

    // 1. Strip HTML tags if enabled
    if (this.options.stripHtml) {
      const beforeLength = value.length;
      value = value.replace(/<[^>]*>/g, '');
      if (value.length < beforeLength) {
        removedPatterns.push('html_tags');
      }
    }

    // 2. Apply dangerous pattern replacements
    for (const { pattern, replacement } of DANGEROUS_PATTERNS) {
      const before = value;
      value = value.replace(pattern, replacement);
      if (value !== before) {
        removedPatterns.push(pattern.toString());
      }
    }

    // 3. Trim whitespace
    if (this.options.trim) {
      value = value.trim();
    }

    // 4. Enforce max length
    if (value.length > this.options.maxLength) {
      value = value.substring(0, this.options.maxLength);
      removedPatterns.push('max_length');
    }

    return {
      value,
      sanitized: removedPatterns.length > 0,
      removedPatterns,
    };
  }

  /**
   * Sanitize a phone number
   */
  sanitizePhone(phone: string): SanitizedResult<string> {
    if (typeof phone !== 'string') {
      return { value: '', sanitized: false, removedPatterns: [] };
    }

    // Only allow digits and leading +
    let value = phone.replace(/[^\d+]/g, '');
    
    // Normalize multiple + signs
    const plusCount = (value.match(/\+/g) || []).length;
    if (plusCount > 1) {
      value = '+' + value.replace(/\+/g, '');
      return { value, sanitized: true, removedPatterns: ['extra_plus_signs'] };
    }

    return { value, sanitized: false, removedPatterns: [] };
  }

  /**
   * Sanitize a group JID
   * Valid format: number@g.us (e.g., 123456789@g.us)
   */
  sanitizeGroupJid(jid: string): SanitizedResult<string> {
    if (typeof jid !== 'string') {
      return { value: '', sanitized: false, removedPatterns: [] };
    }

    // Match pattern: digits@g.us
    const jidRegex = /^(\d+)@g\.us$/;
    const match = jid.match(jidRegex);
    
    if (match) {
      return { value: jid, sanitized: false, removedPatterns: [] };
    }

    // Invalid format - extract parts and reconstruct
    // Format: number@g.us where number is ONLY digits
    const atIndex = jid.indexOf('@');
    if (atIndex > 0) {
      const numberPart = jid.substring(0, atIndex);
      const domainPart = jid.substring(atIndex);
      
      // Get only the first contiguous digit sequence from number part
      const firstDigits = numberPart.match(/^(\d+)/)?.[1] || '';
      
      // Domain must be exactly @g.us (remove anything after .us)
      const domainMatch = domainPart.match(/^(@g\.us)/);
      const validDomain = domainMatch ? domainMatch[1] : '';
      
      if (firstDigits && validDomain) {
        return { value: `${firstDigits}${validDomain}`, sanitized: true, removedPatterns: ['invalid_jid_chars'] };
      }
    }

    // Cannot recover valid format
    return { value: '', sanitized: true, removedPatterns: ['invalid_jid_format'] };
  }

  /**
   * Sanitize an object (recursive)
   */
  sanitizeObject<T extends object>(obj: T): SanitizedResult<T> {
    const removedPatterns: string[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const sanitized = this.sanitize(value);
        result[key] = sanitized.value;
        removedPatterns.push(...sanitized.removedPatterns);
      } else if (typeof value === 'object' && value !== null) {
        const nested = this.sanitizeObject(value as Record<string, unknown>);
        result[key] = nested.value;
        removedPatterns.push(...nested.removedPatterns);
      } else {
        result[key] = value;
      }
    }

    return {
      value: result as T,
      sanitized: removedPatterns.length > 0,
      removedPatterns: [...new Set(removedPatterns)],
    };
  }
}

// ============================================================================
// Standalone Functions
// ============================================================================

const defaultSanitizer = new Sanitizer();

/**
 * Quick sanitize function using defaults
 */
export function sanitize(input: string, options?: SanitizeOptions): string {
  const sanitizer = new Sanitizer(options);
  return sanitizer.sanitize(input).value;
}

/**
 * Check if input contains any suspicious patterns (without modifying)
 */
export function isSuspicious(input: string): boolean {
  const result = defaultSanitizer.sanitize(input);
  return result.sanitized;
}
