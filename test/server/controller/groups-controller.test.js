import test from 'node:test';
import assert from 'node:assert/strict';
import {
	createGroupsController,
	extractInviteCode
} from '../../../server/controller/groups-controller.js';

const flashKeys = {
	toast: 'toast'
};

const createReq = ({ body = {}, query = {}, params = {}, session = {} } = {}) => ({
	body,
	query,
	params,
	session: {
		userId: 7,
		save(callback) {
			callback(null);
		},
		...session
	}
});

const createRes = () => ({
	statusCode: null,
	body: null,
	jsonBody: null,
	rendered: null,
	status(code) {
		this.statusCode = code;
		return this;
	},
	send(body) {
		this.body = body;
		return body;
	},
	json(payload) {
		this.jsonBody = payload;
		return payload;
	},
	render(view, payload) {
		this.rendered = { view, payload };
		return this.rendered;
	}
});

const createController = (overrides = {}) => {
	const flashCalls = [];
	const deps = {
		flashKeys,
		saveFlashAndRedirect: async (req, res, payload) => {
			flashCalls.push(payload);
			return payload;
		},
		createGroupWithAdmin: async () => {},
		deleteGroupByIdForOwner: async () => true,
		findGroupForUser: async () => null,
		findGroupMembers: async () => [],
		findGroupIdByInviteCode: async () => 33,
		findUpcomingEventsForGroup: async () => [],
		joinGroupById: async () => 1,
		regenerateInviteCodeByAdmin: async () => true,
		removeGroupMemberByOwner: async () => ({ ok: true }),
		createInviteCode: () => 'SM-TEST1234',
		extractInviteCode,
		...overrides
	};

	return { flashCalls, controller: createGroupsController(deps) };
};

test('createGroup verlangt Authentifizierung', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.createGroup(
		createReq({ body: { groupName: 'Laufgruppe' }, session: { userId: null } }),
		res
	);

	assert.equal(res.statusCode, 401);
	assert.equal(res.body, 'Nicht autorisiert');
});

test('createGroup validiert fehlenden Gruppennamen', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.createGroup(createReq({ body: { groupName: '   ' } }), res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body, 'Gruppenname ist erforderlich.');
});

test('createGroup erstellt Gruppe mit Invite-Code-Generator und Success-Toast', async () => {
	const calls = [];
	const { controller, flashCalls } = createController({
		createGroupWithAdmin: async (...args) => {
			calls.push(args);
		}
	});

	await controller.createGroup(
		createReq({ body: { groupName: 'Laufgruppe', description: '  Parkrunde  ' } }),
		createRes()
	);

	assert.equal(calls.length, 1);
	assert.equal(calls[0][0], 'Laufgruppe');
	assert.equal(calls[0][1], 'Parkrunde');
	assert.equal(calls[0][2], 7);
	assert.equal(typeof calls[0][3], 'function');
	assert.equal(calls[0][4], 5);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'success',
			message: 'Gruppe wurde erfolgreich erstellt.'
		},
		redirectTo: '/me/groups'
	});
});

test('joinGroup validiert Invite-Code und gibt 400 bei ungueltiger Eingabe', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.joinGroup(createReq({ body: { inviteCode: '   ' } }), res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body, 'Ein gültiger Einladungslink oder Code ist erforderlich.');
});

test('joinGroup meldet unbekannte Gruppe mit 404', async () => {
	const { controller } = createController({
		findGroupIdByInviteCode: async () => null
	});
	const res = createRes();

	await controller.joinGroup(createReq({ body: { inviteCode: 'sm-ab12cd34' } }), res);

	assert.equal(res.statusCode, 404);
	assert.equal(res.body, 'Gruppe mit diesem Einladungslink wurde nicht gefunden.');
});

test('joinGroup liefert Warning-Toast wenn Mitgliedschaft bereits besteht', async () => {
	const { controller, flashCalls } = createController({
		joinGroupById: async () => 0
	});

	await controller.joinGroup(
		createReq({ body: { inviteCode: 'sm-ab12cd34' } }),
		createRes()
	);

	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'warning',
			message: 'Du bist bereits Mitglied in dieser Gruppe.'
		},
		redirectTo: '/me/groups'
	});
});

test('joinGroupFromInviteLink akzeptiert invite-Links und liefert Success-Toast', async () => {
	const joinCalls = [];
	const { controller, flashCalls } = createController({
		findGroupIdByInviteCode: async (code) => {
			assert.equal(code, 'SM-AB12CD34');
			return 33;
		},
		joinGroupById: async (...args) => {
			joinCalls.push(args);
			return 1;
		}
	});

	await controller.joinGroupFromInviteLink(
		createReq({
			query: { invite: 'https://sportmeet.app/groups/join?invite=sm-ab12cd34' }
		}),
		createRes()
	);

	assert.deepEqual(joinCalls, [[33, 7]]);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'success',
			message: 'Du bist der Gruppe erfolgreich beigetreten.'
		},
		redirectTo: '/me/groups'
	});
});

test('deleteGroup liefert 404 wenn Owner nichts loescht', async () => {
	const { controller } = createController({
		deleteGroupByIdForOwner: async () => false
	});
	const res = createRes();

	await controller.deleteGroup(createReq({ params: { groupId: '8' } }), res);

	assert.equal(res.statusCode, 404);
	assert.deepEqual(res.jsonBody, { error: 'Gruppe nicht gefunden.' });
});

test('deleteGroup setzt Flash in Session und liefert ok JSON', async () => {
	const { controller } = createController();
	const req = createReq({ params: { groupId: '8' } });
	const res = createRes();

	await controller.deleteGroup(req, res);

	assert.deepEqual(req.session.toast, {
		variant: 'success',
		message: 'Gruppe wurde erfolgreich gelöscht.'
	});
	assert.equal(res.statusCode, 200);
	assert.deepEqual(res.jsonBody, { ok: true });
});

test('removeGroupMember behandelt spezielle Fehlercodes korrekt', async () => {
	const { controller } = createController({
		removeGroupMemberByOwner: async () => ({ ok: false, code: 'CANNOT_REMOVE_ADMIN' })
	});
	const res = createRes();

	await controller.removeGroupMember(
		createReq({ params: { groupId: '8', memberId: '11' } }),
		res
	);

	assert.equal(res.statusCode, 400);
	assert.deepEqual(res.jsonBody, { error: 'Admin kann nicht entfernt werden.' });
});

test('removeGroupMember setzt Flash und liefert 200 bei Erfolg', async () => {
	const { controller } = createController();
	const req = createReq({ params: { groupId: '8', memberId: '11' } });
	const res = createRes();

	await controller.removeGroupMember(req, res);

	assert.deepEqual(req.session.toast, {
		variant: 'success',
		message: 'Mitglied wurde aus der Gruppe entfernt.'
	});
	assert.equal(res.statusCode, 200);
	assert.deepEqual(res.jsonBody, { ok: true });
});

test('regenerateGroupInvite verweigert ungueltige IDs', async () => {
	const { controller } = createController();
	const res = createRes();

	await controller.regenerateGroupInvite(createReq({ params: { groupId: 'abc' } }), res);

	assert.equal(res.statusCode, 400);
	assert.equal(res.body, 'Ungültige Gruppen-ID.');
});

test('regenerateGroupInvite liefert Success-Toast bei Erfolg', async () => {
	const calls = [];
	const { controller, flashCalls } = createController({
		regenerateInviteCodeByAdmin: async (...args) => {
			calls.push(args);
			return true;
		}
	});

	await controller.regenerateGroupInvite(
		createReq({ params: { groupId: '8' } }),
		createRes()
	);

	assert.equal(calls.length, 1);
	assert.equal(calls[0][0], 8);
	assert.equal(calls[0][1], 7);
	assert.equal(typeof calls[0][2], 'function');
	assert.equal(calls[0][3], 5);
	assert.deepEqual(flashCalls[0], {
		key: flashKeys.toast,
		payload: {
			variant: 'success',
			message: 'Einladungscode und Einladungslink wurden erneuert.'
		},
		redirectTo: '/me/groups'
	});
});
