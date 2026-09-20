import DOMPurify from 'dompurify';

/**
 * SECURITY FIX #2: Input Sanitization Helper
 * Prevents XSS attacks by sanitizing user inputs
 */

// Browser environment setup
const windowObj = typeof window !== 'undefined' ? window : undefined;
const purify = DOMPurify(windowObj);

export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  return purify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'ol', 'ul', 'li', 'p'],
    ALLOWED_ATTR: [],
  });
};

export const sanitizeTextInput = (input: string): string => {
  if (!input) return '';
  // Remove any potentially malicious scripts/URLs
  return purify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['on*'], // Block all event handlers like onclick, onerror, etc.
  });
};

export const sanitizeTextAreaInput = (input: string): string => {
  if (!input) return '';
  return sanitizeTextInput(input);
};

// Use these utilities in your components
export const safeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return sanitizeTextInput(value);
  }
  return String(value || '');
};
