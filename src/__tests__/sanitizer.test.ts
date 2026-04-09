/**
 * Sanitizer Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { Sanitizer, sanitize, isSuspicious } from '../security/sanitizer.js';

describe('Sanitizer', () => {
  const sanitizer = new Sanitizer();

  describe('sanitize', () => {
    it('should pass through normal text unchanged', () => {
      const result = sanitizer.sanitize('Hello, World!');
      expect(result.value).toBe('Hello, World!');
      expect(result.sanitized).toBe(false);
    });

    it('should remove script tags', () => {
      const result = sanitizer.sanitize('<script>alert("xss")</script>Hello');
      expect(result.value).toContain('Hello');
      expect(result.value).not.toContain('<script>');
      expect(result.sanitized).toBe(true);
    });

    it('should remove iframe tags', () => {
      const result = sanitizer.sanitize('<iframe src="evil.com"></iframe>Text');
      expect(result.value).toContain('Text');
      expect(result.value).not.toContain('<iframe>');
    });

    it('should remove javascript: URLs', () => {
      const result = sanitizer.sanitize('<a href="javascript:alert(1)">Click</a>');
      expect(result.value).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const result = sanitizer.sanitize('<img onerror="alert(1)" src="x">');
      expect(result.value).not.toContain('onerror');
    });

    it('should remove SQL injection patterns', () => {
      const result = sanitizer.sanitize('SELECT * FROM users; DROP TABLE users;');
      expect(result.value).not.toContain('SELECT');
      expect(result.value).not.toContain('DROP');
    });

    it('should enforce max length', () => {
      const longSanitizer = new Sanitizer({ maxLength: 10 });
      const result = longSanitizer.sanitize('This is a very long text');
      expect(result.value.length).toBe(10);
    });

    it('should trim whitespace', () => {
      const result = sanitizer.sanitize('  Hello  ');
      expect(result.value).toBe('Hello');
    });
  });

  describe('sanitizePhone', () => {
    it('should preserve valid E.164 numbers', () => {
      const result = sanitizer.sanitizePhone('+5511987654321');
      expect(result.value).toBe('+5511987654321');
      expect(result.sanitized).toBe(false);
    });

    it('should remove invalid characters', () => {
      const result = sanitizer.sanitizePhone('+55 (11) 98765-4321');
      expect(result.value).toBe('+5511987654321');
    });
  });

  describe('sanitizeGroupJid', () => {
    it('should preserve valid group JIDs', () => {
      const result = sanitizer.sanitizeGroupJid('123456789@g.us');
      expect(result.value).toBe('123456789@g.us');
    });

    it('should remove invalid characters', () => {
      const result = sanitizer.sanitizeGroupJid('123-456@g.us<script>');
      expect(result.value).toBe('123@g.us');
    });
  });

  describe('isSuspicious', () => {
    it('should return false for normal text', () => {
      expect(isSuspicious('Hello there')).toBe(false);
    });

    it('should return true for text with injection patterns', () => {
      expect(isSuspicious('<script>alert(1)</script>')).toBe(true);
      expect(isSuspicious('SELECT * FROM users')).toBe(true);
    });
  });
});
