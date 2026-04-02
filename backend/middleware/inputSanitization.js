const DOMPurify = require('isomorphic-dompurify');

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes dangerous tags and attributes while preserving safe formatting
 */
function sanitizeHTML(html) {
  if (typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
}

/**
 * Sanitize plain text to prevent injection attacks
 * Removes special characters that could be used in NoSQL injection
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  // SECURITY FIX: Enforce maximum length before processing
  if (text.length > 10000) {
    text = text.substring(0, 10000);
  }
  
  return text
    .trim()
    .replace(/[<>${}[\]]/g, '') // Remove angle brackets and NoSQL injection chars
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize search query to prevent regex injection
 * Escapes special regex characters
 */
function sanitizeSearchQuery(query) {
  if (typeof query !== 'string') return '';
  
  // SECURITY FIX: Enforce maximum length before processing
  const maxLength = 500;
  if (query.length > maxLength) {
    query = query.substring(0, maxLength);
  }
  
  // Escape regex special characters properly
  return query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, (char) => '\\' + char)
    .substring(0, maxLength);
}

/**
 * Middleware to sanitize story text
 */
function sanitizeStoryMiddleware(req, res, next) {
  if (req.body.text) {
    req.body.text = sanitizeHTML(req.body.text);
  }
  if (req.body.title) {
    req.body.title = sanitizeText(req.body.title);
  }
  next();
}

/**
 * Middleware to sanitize comment/message content
 */
function sanitizeMessageMiddleware(req, res, next) {
  if (req.body.message) {
    req.body.message = sanitizeText(req.body.message);
  }
  if (req.body.content) {
    req.body.content = sanitizeText(req.body.content);
  }
  next();
}

/**
 * Middleware to sanitize search queries
 */
function sanitizeSearchMiddleware(req, res, next) {
  if (req.query.q) {
    req.query.q = sanitizeSearchQuery(req.query.q);
  }
  next();
}

module.exports = {
  sanitizeHTML,
  sanitizeText,
  sanitizeSearchQuery,
  sanitizeStoryMiddleware,
  sanitizeMessageMiddleware,
  sanitizeSearchMiddleware
};
