// ============================================
// Authentication Middleware
// ============================================

/**
 * Ensure user is authenticated via session.
 * Used on all protected routes.
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({
        success: false,
        error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this resource.'
        }
    });
}

module.exports = { requireAuth };
