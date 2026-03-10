import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { PassThrough, Readable, Writable } from 'node:stream';
import { createAuthRouter } from '../../../server/routes/auth.js';
import { createEventsRouter } from '../../../server/routes/events.js';
import { createGroupsRouter } from '../../../server/routes/groups.js';

const invokeApp = async ({ app, method = 'GET', url = '/', headers = {}, body = '' }) =>
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
				this.finished = true;
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

test('auth router verarbeitet urlencoded Body ueber formParser und ruft Login-Handler auf', async () => {
	const app = express();
	const calls = [];
	const passthrough = (req, res, next) => next();

	app.use(
		createAuthRouter({
			formParser: express.urlencoded({ extended: true }),
			getRegisterPage: passthrough,
			getForgotPasswordPage: passthrough,
			getPrivacyPage: passthrough,
			getResetPasswordPage: passthrough,
			register: passthrough,
			login(req, res) {
				calls.push({
					method: req.method,
					body: { ...req.body }
				});
				res.status(200).json({ ok: true, body: { ...req.body } });
			},
			forgotPassword: passthrough,
			resetPassword: passthrough,
			logout: passthrough
		})
	);

	const response = await invokeApp({
		app,
		method: 'POST',
		url: '/login',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			email: 'tony@example.com',
			password: 'Abcdefg1'
		}).toString()
	});

	assert.equal(response.statusCode, 200);
	assert.deepEqual(json(response), {
		ok: true,
		body: {
			email: 'tony@example.com',
			password: 'Abcdefg1'
		}
	});
	assert.deepEqual(calls, [
		{
			method: 'POST',
			body: {
				email: 'tony@example.com',
				password: 'Abcdefg1'
			}
		}
	]);
});

test('events router fuehrt checkAuth vor Handler aus und blockiert unautorisierte Requests', async () => {
	const app = express();
	let handlerCalled = false;

	app.use(
		'/events',
		createEventsRouter({
			checkAuth(req, res) {
				res.status(401).json({ error: 'blocked' });
			},
			formParser: express.urlencoded({ extended: true }),
			createEvent() {
				handlerCalled = true;
			},
			createEventComment() {
				handlerCalled = true;
			},
			deleteEvent() {
				handlerCalled = true;
			},
			getEditEventPage() {
				handlerCalled = true;
			},
			getEventCommentsList() {
				handlerCalled = true;
			},
			getEventById() {
				handlerCalled = true;
			},
			getEventParticipantsList() {
				handlerCalled = true;
			},
			getNearbyPublicEvents() {
				handlerCalled = true;
			},
			getVisibleEvents() {
				handlerCalled = true;
			},
			joinEvent() {
				handlerCalled = true;
			},
			leaveEvent() {
				handlerCalled = true;
			},
			removeEventComment() {
				handlerCalled = true;
			},
			removeEventParticipant() {
				handlerCalled = true;
			},
			updateEvent() {
				handlerCalled = true;
			}
		})
	);

	const response = await invokeApp({
		app,
		method: 'POST',
		url: '/events/123/join'
	});

	assert.equal(response.statusCode, 401);
	assert.deepEqual(json(response), { error: 'blocked' });
	assert.equal(handlerCalled, false);
});

test('events router uebergibt Params an den passenden Handler', async () => {
	const app = express();
	const calls = [];
	const allow = (req, res, next) => next();

	app.use(
		'/events',
		createEventsRouter({
			checkAuth: allow,
			formParser: express.urlencoded({ extended: true }),
			createEvent(req, res) {
				calls.push({ route: 'createEvent', body: req.body });
				res.status(201).json({ ok: true, body: req.body });
			},
			createEventComment(req, res) {
				calls.push({
					route: 'createEventComment',
					params: { ...req.params },
					body: { ...req.body }
				});
				res.status(200).json({ ok: true, params: { ...req.params }, body: { ...req.body } });
			},
			deleteEvent: allow,
			getEditEventPage: allow,
			getEventCommentsList: allow,
			getEventById: allow,
			getEventParticipantsList: allow,
			getNearbyPublicEvents: allow,
			getVisibleEvents: allow,
			joinEvent: allow,
			leaveEvent: allow,
			removeEventComment: allow,
			removeEventParticipant: allow,
			updateEvent: allow
		})
	);

	const response = await invokeApp({
		app,
		method: 'POST',
		url: '/events/55/comments',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ content: 'Hallo Team' }).toString()
	});

	assert.equal(response.statusCode, 200);
	assert.deepEqual(json(response), {
		ok: true,
		params: { eventId: '55' },
		body: { content: 'Hallo Team' }
	});
	assert.deepEqual(calls, [
		{
			route: 'createEventComment',
			params: { eventId: '55' },
			body: { content: 'Hallo Team' }
		}
	]);
});

test('groups router matched /join vor /:groupId und ruft Invite-Handler auf', async () => {
	const app = express();
	const calls = [];
	const allow = (req, res, next) => next();

	app.use(
		'/groups',
		createGroupsRouter({
			checkAuth: allow,
			formParser: express.urlencoded({ extended: true }),
			createGroup: allow,
			deleteGroup: allow,
			getGroupById(req, res) {
				calls.push({ route: 'getGroupById', params: req.params });
				res.status(200).json({ route: 'group', params: req.params });
			},
			getGroupMembersList: allow,
			joinGroupFromInviteLink(req, res) {
				calls.push({ route: 'joinGroupFromInviteLink', query: { ...req.query } });
				res.status(200).json({ route: 'join', query: { ...req.query } });
			},
			joinGroup: allow,
			regenerateGroupInvite: allow,
			removeGroupMember: allow
		})
	);

	const response = await invokeApp({
		app,
		method: 'GET',
		url: '/groups/join?invite=SM-AB12CD34'
	});

	assert.equal(response.statusCode, 200);
	assert.deepEqual(json(response), {
		route: 'join',
		query: { invite: 'SM-AB12CD34' }
	});
	assert.deepEqual(calls, [
		{
			route: 'joinGroupFromInviteLink',
			query: { invite: 'SM-AB12CD34' }
		}
	]);
});

test('groups router verarbeitet urlencoded Body fuer Join-POST', async () => {
	const app = express();
	const calls = [];
	const allow = (req, res, next) => next();

	app.use(
		'/groups',
		createGroupsRouter({
			checkAuth: allow,
			formParser: express.urlencoded({ extended: true }),
			createGroup: allow,
			deleteGroup: allow,
			getGroupById: allow,
			getGroupMembersList: allow,
			joinGroupFromInviteLink: allow,
			joinGroup(req, res) {
				calls.push({ body: { ...req.body } });
				res.status(200).json({ body: { ...req.body } });
			},
			regenerateGroupInvite: allow,
			removeGroupMember: allow
		})
	);

	const response = await invokeApp({
		app,
		method: 'POST',
		url: '/groups/join',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ inviteCode: 'sm-ab12cd34' }).toString()
	});

	assert.equal(response.statusCode, 200);
	assert.deepEqual(json(response), {
		body: { inviteCode: 'sm-ab12cd34' }
	});
	assert.deepEqual(calls, [{ body: { inviteCode: 'sm-ab12cd34' } }]);
});
