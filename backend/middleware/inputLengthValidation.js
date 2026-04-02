/**
 * Input length validation middleware
 * Validates that user input doesn't exceed maximum lengths
 */

const MAX_LENGTHS = {
  title: 200,
  description: 5000,
  message: 2000,
  content: 10000,
  reason: 500,
  details: 5000,
  hubName: 100,
  hubDescription: 1000,
  chatMessage: 2000,
  email: 254,
  username: 50,
  password: 128,
  url: 2048
};

/**
 * Middleware to validate input lengths
 */
function validateInputLengths(req, res, next) {
  const body = req.body;
  
  if (!body || typeof body !== 'object') {
    return next();
  }

  // Check common fields
  const fieldsToCheck = {
    title: MAX_LENGTHS.title,
    description: MAX_LENGTHS.description,
    message: MAX_LENGTHS.message,
    content: MAX_LENGTHS.content,
    reason: MAX_LENGTHS.reason,
    details: MAX_LENGTHS.details,
    hubName: MAX_LENGTHS.hubName,
    hubDescription: MAX_LENGTHS.hubDescription,
    chatMessage: MAX_LENGTHS.chatMessage,
    email: MAX_LENGTHS.email,
    username: MAX_LENGTHS.username,
    password: MAX_LENGTHS.password
  };

  for (const [field, maxLength] of Object.entries(fieldsToCheck)) {
    if (body[field] && typeof body[field] === 'string') {
      if (body[field].length > maxLength) {
        return res.status(400).json({
          success: false,
          error: `${field} must not exceed ${maxLength} characters`,
          field,
          maxLength,
          currentLength: body[field].length
        });
      }
    }
  }

  next();
}

module.exports = {
  validateInputLengths,
  MAX_LENGTHS
};
