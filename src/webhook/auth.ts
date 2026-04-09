/**
 * Webhook Authentication Middleware
 */

import type { IncomingHttpHeaders } from 'http';

// ============================================================================
// Errors
// ============================================================================

export class WebhookAuthError extends Error {
  public readonly isSecurityEvent: true = true;
  public readonly statusCode: 401 = 401;

  constructor(message: string) {
    super(message);
    this.name = 'WebhookAuthError';
  }
}

// ============================================================================
// Authenticator
// ============================================================================

export class WebhookAuthenticator {
  private readonly expectedToken: string;
  private readonly tokenHeader: string;

  constructor(token: string, tokenHeader: string = 'x-webhook-token') {
    this.expectedToken = token;
    this.tokenHeader = tokenHeader.toLowerCase();
  }

  /**
   * Validate the token from request headers
   * @throws WebhookAuthError if validation fails
   */
  validate(headers: IncomingHttpHeaders): void {
    const token = headers[this.tokenHeader];

    if (!token) {
      throw new WebhookAuthError(`Missing authentication token header: ${this.tokenHeader}`);
    }

    if (Array.isArray(token)) {
      throw new WebhookAuthError('Invalid token format: expected string');
    }

    if (!this.constantTimeEquals(token, this.expectedToken)) {
      throw new WebhookAuthError('Invalid authentication token');
    }
  }

  /**
   * Check if request is authenticated (returns boolean instead of throwing)
   */
  isAuthenticated(headers: IncomingHttpHeaders): boolean {
    try {
      this.validate(headers);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create authentication middleware for webhook routes
 */
export function createAuthMiddleware(authenticator: WebhookAuthenticator) {
  return async (
    headers: IncomingHttpHeaders
  ): Promise<{ authenticated: true } | { authenticated: false; error: string; statusCode: 401 }> => {
    try {
      authenticator.validate(headers);
      return { authenticated: true };
    } catch (err) {
      return {
        authenticated: false,
        error: (err as Error).message,
        statusCode: 401,
      };
    }
  };
}
