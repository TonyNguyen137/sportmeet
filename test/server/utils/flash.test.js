import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeFlash, saveFlashAndRedirect } from '../../../server/utils/flash.js';

test('saveFlashAndRedirect speichert Flash-Payload und leitet weiter', async () => {
	const session = {
		save(callback) {
			callback(null);
		}
	};
	const res = {
		redirectPath: null,
		redirect(path) {
			this.redirectPath = path;
			return path;
		}
	};

	await saveFlashAndRedirect({ session }, res, {
		key: 'toast',
		payload: { variant: 'success' },
		redirectTo: '/me'
	});

	assert.deepEqual(session.toast, { variant: 'success' });
	assert.equal(res.redirectPath, '/me');
});

test('saveFlashAndRedirect liefert 500 bei Session-Speicherfehler', async () => {
	const originalConsoleError = console.error;
	console.error = () => {};

	const session = {
		save(callback) {
			callback(new Error('save failed'));
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

	try {
		await saveFlashAndRedirect({ session }, res, {
			key: 'toast',
			payload: { variant: 'error' }
		});
	} finally {
		console.error = originalConsoleError;
	}

	assert.equal(res.statusCode, 500);
	assert.equal(res.body, 'Internal Server Error');
});

test('consumeFlash liest Werte und entfernt sie aus der Session', () => {
	const req = {
		session: {
			toast: { variant: 'warning', message: 'Hinweis' }
		}
	};

	const value = consumeFlash(req, 'toast', {});

	assert.deepEqual(value, { variant: 'warning', message: 'Hinweis' });
	assert.equal('toast' in req.session, false);
});

test('consumeFlash liefert Fallback ohne Session-Fehler', () => {
	assert.deepEqual(consumeFlash({}, 'toast', { ok: false }), { ok: false });
});
