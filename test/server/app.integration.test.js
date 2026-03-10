import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PassThrough, Readable, Writable } from 'node:stream';
import { createApp } from '../../server/app.js';

const invokeApp = async ({
	app,
	method = 'GET',
	url = '/',
	headers = {},
	body = ''
}) =>
	await new Promise((resolve, reject) => {
		const reqStream = new Readable({
			read() {
				this.push(body);
				this.push(null);
			}
		});

		const normalizedHeaders = Object.fromEntries(
			Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
		);
		if (body && !normalizedHeaders['content-length']) {
			normalizedHeaders['content-length'] = String(Buffer.byteLength(body));
		}
		const socket = new PassThrough();

		Object.assign(reqStream, {
			method,
			url,
			headers: normalizedHeaders,
			connection: socket,
			socket,
			httpVersionMajor: 1,
			httpVersionMinor: 1
		});

		const chunks = [];
		const resStream = new Writable({
			write(chunk, encoding, callback) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
				callback();
			}
		});

		const res = Object.assign(resStream, {
			statusCode: 200,
			headers: {},
			locals: {},
			setHeader(name, value) {
				this.headers[name.toLowerCase()] = value;
			},
			getHeader(name) {
				return this.headers[name.toLowerCase()];
			},
			removeHeader(name) {
				delete this.headers[name.toLowerCase()];
			},
			writeHead(statusCode, headersToSet = {}) {
				this.statusCode = statusCode;
				for (const [name, value] of Object.entries(headersToSet)) {
					this.setHeader(name, value);
				}
				return this;
			},
			end(chunk, encoding, callback) {
				if (chunk) {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
				}
				Writable.prototype.end.call(this, callback);
				resolve({
					statusCode: this.statusCode,
					headers: this.headers,
					text: Buffer.concat(chunks).toString('utf8')
				});
			}
		});

		reqStream.res = res;

		app.handle(reqStream, res, reject);
	});

const json = (response) => JSON.parse(response.text || '{}');

const createTestApp = ({
	sessionData = {},
	consumeFlash = () => ({}),
	extraAuthRoutes
} = {}) => {
	const authRouter = express.Router();
	if (extraAuthRoutes) {
		authRouter.use(extraAuthRoutes);
	}

	const app = createApp({
		config: { env: 'test', sessionSecret: 'test-secret' },
		consumeFlash,
		flashKeys: {
			loginFeedback: 'loginFeedback',
			authSuccess: 'authSuccess',
			eventFormFeedback: 'eventFormFeedback',
			toast: 'toast'
		},
		checkAuth(req, res, next) {
			if (req.session?.userId) {
				return next();
			}
			return res.redirect('/');
		},
		loadUserData(req, res, next) {
			res.locals.currentUser = null;
			res.locals.userGroups = [];
			next();
		},
		attachCsrfToken(req, res, next) {
			res.locals.csrfToken = 'csrf-token';
			next();
		},
		requireCsrfToken(req, res, next) {
			next();
		},
		attachToast(req, res, next) {
			res.locals.toast = null;
			next();
		},
		findAllSports: async () => [],
		findMyEventsForUser: async () => [],
		sessionMiddleware(req, res, next) {
			req.session = { ...sessionData };
			next();
		},
		authRoutes: authRouter,
		userRoutes: express.Router(),
		eventsRoutes: express.Router(),
		groupsRoutes: express.Router()
	});

	app.response.render = function render(view, locals) {
		return this.status(this.statusCode || 200).json({ view, locals });
	};

	return app;
};

test('GET / rendert Startseite fuer Gaeste mit Flash-Daten', async () => {
	const app = createTestApp({
		consumeFlash(req, key, fallback) {
			if (key === 'toast') return null;
			if (key === 'loginFeedback') {
				return {
					errorTitle: 'Bitte prüfen',
					errors: ['E-Mail-Adresse'],
					values: { email: 'tony@example.com' }
				};
			}
			if (key === 'authSuccess') {
				return { message: 'ok', values: { email: 'ignored@example.com' } };
			}
			return fallback;
		}
	});

	const response = await invokeApp({
		app,
		method: 'GET',
		url: '/',
		headers: { accept: 'application/json' }
	});

	assert.equal(response.statusCode, 200);
	assert.deepEqual(json(response), {
		view: 'base',
		locals: {
			title: 'SportMeet Startseite',
			template: 'index',
			loginErrorTitle: 'Bitte prüfen',
			loginErrors: ['E-Mail-Adresse'],
			loginValues: { email: 'tony@example.com' },
			loginSuccessMessage: 'ok'
		}
	});
});

test('GET / leitet eingeloggte Nutzer auf /me weiter', async () => {
	const app = createTestApp({
		sessionData: { userId: 9 }
	});

	const response = await invokeApp({
		app,
		method: 'GET',
		url: '/'
	});

	assert.equal(response.statusCode, 302);
	assert.equal(response.headers.location, '/me');
});

test('unbekannte Route rendert 404-Seite', async () => {
	const app = createTestApp();

	const response = await invokeApp({
		app,
		method: 'GET',
		url: '/does-not-exist',
		headers: { accept: 'application/json' }
	});

	assert.equal(response.statusCode, 404);
	assert.deepEqual(json(response), {
		view: 'base',
		locals: {
			title: '404 - Seite nicht gefunden',
			template: 'page-404'
		}
	});
});

test('globaler Error-Handler liefert JSON fuer JSON-Requests', async () => {
	const boomRouter = express.Router();
	boomRouter.get('/boom', (req, res, next) => {
		const error = new Error('Kaputt');
		error.statusCode = 422;
		next(error);
	});

	const app = createTestApp({
		extraAuthRoutes: boomRouter
	});
	const originalConsoleError = console.error;
	console.error = () => {};

	try {
		const response = await invokeApp({
			app,
			method: 'GET',
			url: '/boom',
			headers: { accept: 'application/json' }
		});

		assert.equal(response.statusCode, 422);
		assert.deepEqual(json(response), { error: 'Kaputt' });
	} finally {
		console.error = originalConsoleError;
	}
});
