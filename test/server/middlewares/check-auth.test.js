import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuth } from '../../../server/middlewares/check-auth.js';

test('checkAuth ruft next bei eingeloggtem Nutzer auf', () => {
	let nextCalled = false;

	checkAuth({ session: { userId: 42 } }, {}, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
});

test('checkAuth leitet anonyme Nutzer auf / um', () => {
	const res = {
		redirectPath: null,
		redirect(path) {
			this.redirectPath = path;
		}
	};

	checkAuth({ session: {} }, res, () => {});

	assert.equal(res.redirectPath, '/');
});
