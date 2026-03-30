/**
 * Input sanitization utilities (DEC-031).
 * Strips HTML, prevents XSS, mitigates LLM prompt injection.
 *
 * Uses regex-based stripping for now. Can be upgraded to
 * isomorphic-dompurify when the dependency is installed.
 */

/**
 * Sanitize user text input for storage and display.
 * Strips HTML tags, decodes entities, normalizes whitespace.
 */
export function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')                     // Strip HTML tags
    .replace(/&lt;/g, '<')                       // Decode common entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/<[^>]*>/g, '')                     // Strip again after decode
    .replace(/javascript:/gi, '')                // Strip JS protocol
    .replace(/on\w+\s*=/gi, '')                  // Strip event handlers
    .replace(/\s+/g, ' ')                        // Normalize whitespace
    .trim();
}

/**
 * Sanitize text before passing to LLM prompts.
 * Strips known prompt injection patterns while preserving legitimate content.
 */
export function sanitizeForLLM(text: string): string {
  let sanitized = sanitizeInput(text);

  // Strip prompt injection patterns (case-insensitive)
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /ignore\s+(all\s+)?above\s+instructions/gi,
    /disregard\s+(all\s+)?previous/gi,
    /you\s+are\s+now\s+a/gi,
    /new\s+instructions?:/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /human\s*:/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<<SYS>>/gi,
    /<\/SYS>/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[filtered]');
  }

  return sanitized;
}

/**
 * Sanitize all text fields in an object (shallow).
 * Useful for sanitizing parsed request bodies.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === 'string') {
      (result[field] as unknown) = sanitizeInput(result[field] as string);
    }
  }
  return result;
}
