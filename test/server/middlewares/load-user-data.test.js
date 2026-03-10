import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadUserData } from '../../../server/middlewares/load-user-data.js';

const createReq = ({
	session = {},
	protocol = 'https',
	host = 'sportmeet.test'
} = {}) => ({
	session,
	protocol,
	get(name) {
		return name === 'host' ? host : undefined;
	}
});

const createRes = () => ({
	locals: {}
});

test('loadUserData setzt leere Werte ohne eingeloggten Nutzer', async () => {
	const middleware = createLoadUserData({
		findUserBasicById: async () => {
			throw new Error('should not run');
		},
		findUserGroupsByUserId: async () => {
			throw new Error('should not run');
		}
	});
	const res = createRes();
	let nextCalled = false;

	await middleware(createReq(), res, () => {
		nextCalled = true;
	});

	assert.equal(nextCalled, true);
	assert.equal(res.locals.currentUser, null);
	assert.deepEqual(res.locals.userGroups, []);
});

test('loadUserData lädt User und ergänzt Invite-Links', async () => {
	const middleware = createLoadUserData({
		findUserBasicById: async (userId) => ({
			id: userId,
			email: 'tony@example.com',
			first_name: 'Tony'
		}),
		findUserGroupsByUserId: async () => [
			{
				id: 1,
				name: 'Laufgruppe',
				invite_code: 'SM-AB12CD34',
				role: 'admin',
				member_count: 8
			}
		]
	});
	const res = createRes();

	await middleware(createReq({ session: { userId: 9 } }), res, () => {});

	assert.deepEqual(res.locals.currentUser, {
		id: 9,
		email: 'tony@example.com',
		first_name: 'Tony'
	});
	assert.deepEqual(res.locals.userGroups, [
		{
			id: 1,
			name: 'Laufgruppe',
			invite_code: 'SM-AB12CD34',
			role: 'admin',
			member_count: 8,
			invite_link: 'https://sportmeet.test/groups/join?invite=SM-AB12CD34'
		}
	]);
});

test('loadUserData faengt Fehler ab und setzt sichere Defaults', async () => {
	const middleware = createLoadUserData({
		findUserBasicById: async () => {
			throw new Error('db down');
		},
		findUserGroupsByUserId: async () => []
	});
	const res = createRes();
	const originalConsoleError = console.error;
	console.error = () => {};

	try {
		await middleware(createReq({ session: { userId: 9 } }), res, () => {});
	} finally {
		console.error = originalConsoleError;
	}

	assert.equal(res.locals.currentUser, null);
	assert.deepEqual(res.locals.userGroups, []);
});
