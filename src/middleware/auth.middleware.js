const { verifyAccessToken } = require('../utils/token.util');
const ApiError = require('../utils/ApiError');

/**
 * Requires a valid Bearer access token. Attaches { id, email, role } to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }
}

/**
 * Attaches req.user if a valid token is present, but never blocks the
 * request. Used on public routes (e.g. property detail) where we want
 * to know the viewer without requiring login.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch (_) {
      // ignore invalid token on optional routes
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
