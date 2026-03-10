import test from 'node:test';
import assert from 'node:assert/strict';
import { attachCsrfToken, requireCsrfToken } from '../../../server/middlewares/csrf.js';

test('attachCsrfToken erzeugt ein Token in Session und res.locals', () => {
	const req = { session: {} };
	const res = { locals: {} };
	let nextCalled = false;

	attachCsrfToken(req, res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
	assert.equal(typeof req.session.csrfToken, 'string');
	assert.equal(req.session.csrfToken.length, 64);
	assert.equal(res.locals.csrfToken, req.session.csrfToken);
});

test('requireCsrfToken laesst sichere HTTP-Methoden durch', () => {
	const req = { method: 'GET' };
	let nextCalled = false;

	requireCsrfToken(req, {}, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
});

test('requireCsrfToken akzeptiert ein gueltiges Body-Token', () => {
	const req = {
		method: 'POST',
		session: { csrfToken: 'abc123' },
		body: { _csrf: 'abc123' },
		get() {
			return undefined;
		}
	};
	let nextCalled = false;

	requireCsrfToken(req, {}, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
});

test('requireCsrfToken akzeptiert alternativ ein gueltiges Header-Token', () => {
	const req = {
		method: 'DELETE',
		session: { csrfToken: 'header-token' },
		body: {},
		get(name) {
			return name === 'x-csrf-token' ? 'header-token' : undefined;
		}
	};
	let nextCalled = false;

	requireCsrfToken(req, {}, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
});

test('requireCsrfToken antwortet bei JSON-Requests mit 403 JSON', () => {
	const req = {
		method: 'POST',
		session: { csrfToken: 'expected' },
		body: { _csrf: 'actual' },
		get() {
			return undefined;
		},
		accepts(type) {
			return type === 'json';
		}
	};
	const res = {
		statusCode: null,
		payload: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(payload) {
			this.payload = payload;
			return payload;
		}
	};

	const result = requireCsrfToken(req, res, () => {});

	assert.equal(res.statusCode, 403);
	assert.deepEqual(res.payload, { error: 'CSRF Token ungültig.' });
	assert.deepEqual(result, { error: 'CSRF Token ungültig.' });
});

test('requireCsrfToken antwortet bei HTML-Requests mit 403 Text', () => {
	const req = {
		method: 'POST',
		session: { csrfToken: 'expected' },
		body: {},
		get() {
			return undefined;
		},
		accepts() {
			return false;
		}
	};
	const res = {
		statusCode: null,
		body: null,
		status(code) {
			this.statusCode = code;
			return this;
		},
		send(body) {
			this.body = body;
			return body;
		}
	};

	const result = requireCsrfToken(req, res, () => {});

	assert.equal(res.statusCode, 403);
	assert.equal(res.body, 'CSRF Token ungültig.');
	assert.equal(result, 'CSRF Token ungültig.');
});
