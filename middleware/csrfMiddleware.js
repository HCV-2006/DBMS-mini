// ============================================
// CSRF Protection Middleware (Double-Submit Cookie)
// ============================================
const crypto = require('crypto');

/**
 * Generate a CSRF token and store it in the session.
 */
function generateCsrfToken(req, res, next) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    next();
}

/**
 * Validate CSRF token on state-changing requests.
 */
function validateCsrfToken(req, res, next) {
    // Only check on state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const token = req.headers['x-csrf-token'] || req.body?._csrf;
        if (!token || token !== req.session.csrfToken) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'CSRF_VALIDATION_FAILED',
                    message: 'Invalid or missing CSRF token.'
                }
            });
        }
    }
    next();
}

module.exports = { generateCsrfToken, validateCsrfToken };
