import crypto from 'node:crypto';
import { FLASH_KEYS, saveFlashAndRedirect } from '../utils/flash.js';
import {
	createGroupWithAdmin,
	deleteGroupByIdForOwner,
	findGroupForUser,
	findGroupMembers,
	findGroupIdByInviteCode,
	findUpcomingEventsForGroup,
	joinGroupById,
	regenerateInviteCodeByAdmin,
	removeGroupMemberByOwner
} from '../model/groups-model.js';

const defaultCreateInviteCode = () => `SM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

export const extractInviteCode = (rawInput) => {
	if (!rawInput) {
		return null;
	}

	let candidate = rawInput.trim();

	if (!candidate) {
		return null;
	}

	if (/^https?:\/\//i.test(candidate)) {
		try {
			const url = new URL(candidate);
			candidate =
				url.searchParams.get('invite') ||
				url.searchParams.get('code') ||
				url.pathname.split('/').filter(Boolean).at(-1) ||
				'';
		} catch {
			return null;
		}
	}

	candidate = candidate
		.split('?')[0]
		.split('#')[0]
		.replace(/^\/+|\/+$/g, '');

	return candidate ? candidate.toUpperCase() : null;
};

const defaultDeps = {
	flashKeys: FLASH_KEYS,
	saveFlashAndRedirect,
	createGroupWithAdmin,
	deleteGroupByIdForOwner,
	findGroupForUser,
	findGroupMembers,
	findGroupIdByInviteCode,
	findUpcomingEventsForGroup,
	joinGroupById,
	regenerateInviteCodeByAdmin,
	removeGroupMemberByOwner,
	createInviteCode: defaultCreateInviteCode,
	extractInviteCode
};

export const createGroupsController = (deps = defaultDeps) => {
	const {
		flashKeys,
		saveFlashAndRedirect: saveFlashAndRedirectValue,
		createGroupWithAdmin: createGroupWithAdminValue,
		deleteGroupByIdForOwner: deleteGroupByIdForOwnerValue,
		findGroupForUser: findGroupForUserValue,
		findGroupMembers: findGroupMembersValue,
		findGroupIdByInviteCode: findGroupIdByInviteCodeValue,
		findUpcomingEventsForGroup: findUpcomingEventsForGroupValue,
		joinGroupById: joinGroupByIdValue,
		regenerateInviteCodeByAdmin: regenerateInviteCodeByAdminValue,
		removeGroupMemberByOwner: removeGroupMemberByOwnerValue,
		createInviteCode,
		extractInviteCode: extractInviteCodeValue
	} = deps;

	const getGroupById = async (req, res) => {
		const userId = req.session?.userId;
		const groupId = Number(req.params.groupId);

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!Number.isInteger(groupId) || groupId <= 0) {
			return res.status(404).render('base', {
				title: '404 - Seite nicht gefunden',
				template: 'page-404'
			});
		}

		try {
			const group = await findGroupForUserValue(groupId, userId);
			if (!group) {
				return res.status(404).render('base', {
					title: '404 - Seite nicht gefunden',
					template: 'page-404'
				});
			}

			const members = await findGroupMembersValue(groupId, userId);
			const upcomingEvents = await findUpcomingEventsForGroupValue(groupId, userId, 12);
			return res.render('base', {
				title: `SportMeet - Gruppe ${group.name}`,
				template: 'single-group',
				group,
				members,
				upcomingEvents
			});
		} catch (err) {
			console.error('Fehler beim Laden der Gruppe:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	const getGroupMembersList = async (req, res) => {
		const userId = req.session?.userId;
		const groupId = Number(req.params.groupId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(groupId) || groupId <= 0) {
			return res.status(400).json({ error: 'Ungültige Gruppen-ID.' });
		}

		try {
			const group = await findGroupForUserValue(groupId, userId);
			if (!group) {
				return res.status(404).json({ error: 'Gruppe nicht gefunden.' });
			}

			const members = await findGroupMembersValue(groupId, userId);
			return res.json({ members });
		} catch (err) {
			console.error('Fehler beim Laden der Gruppenmitglieder:', err);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const createGroup = async (req, res) => {
		const userId = req.session?.userId;
		const groupName = req.body.groupName?.trim();
		const description = req.body.description?.trim() || null;

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!groupName) {
			return res.status(400).send('Gruppenname ist erforderlich.');
		}

		try {
			await createGroupWithAdminValue(groupName, description, userId, createInviteCode, 5);
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Gruppe wurde erfolgreich erstellt.'
				},
				redirectTo: '/me/groups'
			});
		} catch (err) {
			console.error('Fehler beim Erstellen der Gruppe:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	const joinGroup = async (req, res) => {
		const userId = req.session?.userId;
		const inviteCode = extractInviteCodeValue(req.body.inviteCode);

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!inviteCode) {
			return res.status(400).send('Ein gültiger Einladungslink oder Code ist erforderlich.');
		}

		try {
			const groupId = await findGroupIdByInviteCodeValue(inviteCode);
			if (!groupId) {
				return res.status(404).send('Gruppe mit diesem Einladungslink wurde nicht gefunden.');
			}

			const membershipCount = await joinGroupByIdValue(groupId, userId);

			if (membershipCount === 0) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Du bist bereits Mitglied in dieser Gruppe.'
					},
					redirectTo: '/me/groups'
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Du bist der Gruppe erfolgreich beigetreten.'
				},
				redirectTo: '/me/groups'
			});
		} catch (err) {
			console.error('Fehler beim Beitritt zur Gruppe:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	const joinGroupFromInviteLink = async (req, res) => {
		const userId = req.session?.userId;
		const inviteCode = extractInviteCodeValue(req.query?.invite || req.query?.code || '');

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!inviteCode) {
			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'warning',
					message: 'Ein gültiger Einladungslink oder Code ist erforderlich.'
				},
				redirectTo: '/me/groups'
			});
		}

		try {
			const groupId = await findGroupIdByInviteCodeValue(inviteCode);
			if (!groupId) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Gruppe mit diesem Einladungslink wurde nicht gefunden.'
					},
					redirectTo: '/me/groups'
				});
			}

			const membershipCount = await joinGroupByIdValue(groupId, userId);

			if (membershipCount === 0) {
				return saveFlashAndRedirectValue(req, res, {
					key: flashKeys.toast,
					payload: {
						variant: 'warning',
						message: 'Du bist bereits Mitglied in dieser Gruppe.'
					},
					redirectTo: '/me/groups'
				});
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Du bist der Gruppe erfolgreich beigetreten.'
				},
				redirectTo: '/me/groups'
			});
		} catch (err) {
			console.error('Fehler beim Beitritt per Einladungslink:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	const deleteGroup = async (req, res) => {
		const userId = req.session?.userId;
		const groupId = Number(req.params.groupId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(groupId) || groupId <= 0) {
			return res.status(400).json({ error: 'Ungültige Gruppen-ID.' });
		}

		try {
			const didDelete = await deleteGroupByIdForOwnerValue(groupId, userId);

			if (!didDelete) {
				return res.status(404).json({ error: 'Gruppe nicht gefunden.' });
			}

			req.session[flashKeys.toast] = {
				variant: 'success',
				message: 'Gruppe wurde erfolgreich gelöscht.'
			};

			return req.session.save((sessionError) => {
				if (sessionError) {
					console.error('Session save error:', sessionError);
					return res.status(500).json({ error: 'Server Fehler' });
				}

				return res.status(200).json({ ok: true });
			});
		} catch (err) {
			console.error('Fehler beim Loeschen der Gruppe:', err);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const removeGroupMember = async (req, res) => {
		const userId = req.session?.userId;
		const groupId = Number(req.params.groupId);
		const memberId = Number(req.params.memberId);

		if (!userId) {
			return res.status(401).json({ error: 'Nicht autorisiert' });
		}

		if (!Number.isInteger(groupId) || groupId <= 0 || !Number.isInteger(memberId) || memberId <= 0) {
			return res.status(400).json({ error: 'Ungültige Anfrage.' });
		}

		try {
			const result = await removeGroupMemberByOwnerValue(groupId, memberId, userId);

			if (!result.ok) {
				if (result.code === 'CANNOT_REMOVE_ADMIN') {
					return res.status(400).json({ error: 'Admin kann nicht entfernt werden.' });
				}
				if (result.code === 'MEMBER_NOT_FOUND') {
					return res.status(404).json({ error: 'Mitglied nicht gefunden.' });
				}
				return res.status(403).json({ error: 'Nicht erlaubt.' });
			}

			req.session[flashKeys.toast] = {
				variant: 'success',
				message: 'Mitglied wurde aus der Gruppe entfernt.'
			};

			return req.session.save((sessionError) => {
				if (sessionError) {
					console.error('Session save error:', sessionError);
					return res.status(500).json({ error: 'Server Fehler' });
				}

				return res.status(200).json({ ok: true });
			});
		} catch (err) {
			console.error('Fehler beim Entfernen eines Gruppenmitglieds:', err);
			return res.status(500).json({ error: 'Server Fehler' });
		}
	};

	const regenerateGroupInvite = async (req, res) => {
		const userId = req.session?.userId;
		const groupId = Number(req.params.groupId);

		if (!userId) {
			return res.status(401).send('Nicht autorisiert');
		}

		if (!Number.isInteger(groupId) || groupId <= 0) {
			return res.status(400).send('Ungültige Gruppen-ID.');
		}

		try {
			const didRegenerate = await regenerateInviteCodeByAdminValue(groupId, userId, createInviteCode, 5);

			if (!didRegenerate) {
				return res.status(403).send('Nicht erlaubt.');
			}

			return saveFlashAndRedirectValue(req, res, {
				key: flashKeys.toast,
				payload: {
					variant: 'success',
					message: 'Einladungscode und Einladungslink wurden erneuert.'
				},
				redirectTo: '/me/groups'
			});
		} catch (err) {
			console.error('Fehler beim Erneuern des Einladungscodes:', err);
			return res.status(500).send('Server Fehler');
		}
	};

	return {
		getGroupById,
		getGroupMembersList,
		createGroup,
		joinGroup,
		joinGroupFromInviteLink,
		deleteGroup,
		removeGroupMember,
		regenerateGroupInvite
	};
};

export const {
	getGroupById,
	getGroupMembersList,
	createGroup,
	joinGroup,
	joinGroupFromInviteLink,
	deleteGroup,
	removeGroupMember,
	regenerateGroupInvite
} = createGroupsController();
