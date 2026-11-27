import { describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { navigateTo } from './navigation';

describe('navigateTo', () => {
  let locationMock: { href: string; hash: string; replace: Mock<(url: string | URL) => void> };

  beforeEach(() => {
    locationMock = { href: '', hash: '', replace: vi.fn<(url: string | URL) => void>() };
  });

  describe('safe external URLs', () => {
    it('should navigate to https URLs', () => {
      const result = navigateTo('https://example.com', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.href).toBe('https://example.com');
    });

    it('should navigate to mailto URLs', () => {
      const result = navigateTo('mailto:test@example.com', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.href).toBe('mailto:test@example.com');
    });
  });

  describe('dangerous URL schemes (XSS prevention)', () => {
    it('should reject javascript: URLs', () => {
      const result = navigateTo('javascript:alert("XSS")', { location: locationMock });
      expect(result).toBe(false);
      expect(locationMock.href).toBe('');
    });

    it('should reject data: URLs', () => {
      const result = navigateTo('data:text/html,<script>alert("XSS")</script>', {
        location: locationMock,
      });
      expect(result).toBe(false);
      expect(locationMock.href).toBe('');
    });
  });

  describe('internal navigation', () => {
    it('should use hash routing for paths starting with /', () => {
      const result = navigateTo('/settings', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.hash).toBe('/settings');
    });

    it('should add leading slash to paths without one', () => {
      const result = navigateTo('settings', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.hash).toBe('/settings');
    });

    it('should handle empty paths', () => {
      const result = navigateTo('', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.hash).toBe('/');
    });

    it('should replace the current hash when requested', () => {
      const result = navigateTo('/posts', { replace: true, location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.replace).toHaveBeenCalledWith('#/posts');
      expect(locationMock.hash).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive URL schemes', () => {
      const result = navigateTo('HTTPS://example.com', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.href).toBe('HTTPS://example.com');
    });

    it('should handle complex internal routes with query params', () => {
      const result = navigateTo('/settings/general?tab=advanced', { location: locationMock });
      expect(result).toBe(true);
      expect(locationMock.hash).toBe('/settings/general?tab=advanced');
    });
  });
});
