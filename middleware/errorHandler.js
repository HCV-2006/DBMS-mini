// ============================================
// Centralized Error Handler
// ============================================

/**
 * Catches all unhandled errors and returns a standardized JSON response.
 * In production, stack traces are never leaked to the client.
 */
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err.stack || err.message || err);

    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred.'
        : (err.message || 'An internal server error occurred.');

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message
        }
    });
}

module.exports = { errorHandler };
