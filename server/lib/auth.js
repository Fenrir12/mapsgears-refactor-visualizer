const session = require('express-session');
const { default: MongoStore } = require('connect-mongo');

/**
 * Simple password-based authentication.
 * Set DASHBOARD_PASSWORD env var to enable. Leave blank to disable auth.
 */

function createSessionMiddleware() {
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60, // 7 days
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });
}

const PUBLIC_PATHS = ['/api/auth/me', '/api/auth/login'];

function requireAuth(req, res, next) {
  if (PUBLIC_PATHS.some(p => req.path === p)) return next();

  // Only guard API routes — static files and SPA fallback are public
  if (!req.path.startsWith('/api/')) return next();

  // If no password configured, skip auth entirely
  if (!process.env.DASHBOARD_PASSWORD) return next();

  if (req.session && req.session.authenticated) return next();

  return res.status(401).json({ error: 'Not authenticated' });
}

function meHandler(req, res) {
  if (!process.env.DASHBOARD_PASSWORD) {
    return res.json({ authenticated: true });
  }
  if (req.session && req.session.authenticated) {
    return res.json({ authenticated: true });
  }
  return res.status(401).json({ error: 'Not authenticated' });
}

function loginHandler(req, res) {
  const { password } = req.body;
  if (!process.env.DASHBOARD_PASSWORD) {
    return res.json({ ok: true });
  }
  if (password === process.env.DASHBOARD_PASSWORD) {
    req.session.authenticated = true;
    req.session.save(() => {
      res.json({ ok: true });
    });
  } else {
    res.status(403).json({ error: 'Wrong password' });
  }
}

function logoutHandler(req, res) {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
}

module.exports = {
  createSessionMiddleware,
  requireAuth,
  meHandler,
  loginHandler,
  logoutHandler,
};
