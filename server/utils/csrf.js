import crypto from 'node:crypto';

const CSRF_SESSION_KEY = 'csrfToken';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getOrCreateCsrfToken = (req) => {
	if (!req.session) {
		return '';
	}

	if (typeof req.session[CSRF_SESSION_KEY] !== 'string') {
		req.session[CSRF_SESSION_KEY] = crypto.randomBytes(32).toString('hex');
	}

	return req.session[CSRF_SESSION_KEY];
};

export const attachCsrfToken = (req, res, next) => {
	res.locals.csrfToken = getOrCreateCsrfToken(req);
	next();
};

const safeEqual = (a, b) => {
	if (typeof a !== 'string' || typeof b !== 'string') {
		return false;
	}

	const aBuffer = Buffer.from(a, 'utf8');
	const bBuffer = Buffer.from(b, 'utf8');

	if (aBuffer.length !== bBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(aBuffer, bBuffer);
};

export const requireCsrfToken = (req, res, next) => {
	if (SAFE_METHODS.has(req.method)) {
		return next();
	}

	const sessionToken = req.session?.[CSRF_SESSION_KEY];
	const bodyToken = req.body?._csrf;
	const headerToken = req.get('x-csrf-token');
	const submittedToken =
		typeof bodyToken === 'string' && bodyToken.length > 0 ? bodyToken : headerToken;

	if (!safeEqual(sessionToken, submittedToken)) {
		if (req.accepts('json')) {
			return res.status(403).json({ error: 'CSRF Token ungültig.' });
		}

		return res.status(403).send('CSRF Token ungültig.');
	}

	return next();
};
