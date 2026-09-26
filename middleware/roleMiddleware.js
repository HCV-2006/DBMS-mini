// ============================================
// Role-Based Authorization Middleware
// ============================================

/**
 * Restrict access to specific roles.
 * Usage: requireRole('admin') or requireRole('admin', 'staff')
 */
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'You must be logged in.'
                }
            });
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to perform this action.'
                }
            });
        }

        next();
    };
}

module.exports = { requireRole };
