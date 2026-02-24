import crypto from 'node:crypto';
import express from 'express';
import pool from '../models/db.js';
import { checkAuth, formParser } from '../utils/auth.js';

const router = express.Router();

const DEFAULT_GROUP_COLOR = '#3B82F6';
const ALLOWED_GROUP_COLORS = new Set([
	'#3B82F6',
	'#22C55E',
	'#A855F7',
	'#EF4444',
	'#EAB308',
	'#EC4899'
]);

const createInviteCode = () => `SM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const extractInviteCode = (rawInput) => {
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

	candidate = candidate.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');

	return candidate ? candidate.toUpperCase() : null;
};

router.get('/:groupId', checkAuth, async (req, res) => {
	const userId = req.session?.userId;
	const groupId = Number(req.params.groupId);

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!Number.isInteger(groupId) || groupId <= 0) {
		return res.status(400).send('Ungueltige Gruppen-ID.');
	}

	try {
		const result = await pool.query(
			`SELECT g.id, g.name, g.color
			 FROM groups g
			 INNER JOIN group_users gu ON gu.group_id = g.id
			 WHERE g.id = $1 AND gu.user_id = $2`,
			[groupId, userId]
		);

		if (result.rows.length === 0) {
			return res.status(404).send('Gruppe nicht gefunden.');
		}

		return res.render('base', {
			title: `SportMeet - Gruppe ${result.rows[0].name}`,
			template: 'page-group',
			group: result.rows[0]
		});
	} catch (err) {
		console.error('Fehler beim Laden der Gruppe:', err);
		return res.status(500).send('Server Fehler');
	}
});

router.post('/', checkAuth, formParser, async (req, res) => {
	const userId = req.session?.userId;
	const groupName = req.body.groupName?.trim();
	const groupColor = (req.body.groupColor || DEFAULT_GROUP_COLOR).toUpperCase();

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!groupName) {
		return res.status(400).send('Gruppenname ist erforderlich.');
	}

	if (!ALLOWED_GROUP_COLORS.has(groupColor)) {
		return res.status(400).send('Ungueltige Gruppenfarbe.');
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		let groupId = null;
		let attempts = 0;

		while (!groupId && attempts < 5) {
			attempts += 1;
			const inviteCode = createInviteCode();

			try {
				const groupResult = await client.query(
					`INSERT INTO groups (name, invite_code, color, created_by)
					 VALUES ($1, $2, $3, $4)
					 RETURNING id`,
					[groupName, inviteCode, groupColor, userId]
				);

				groupId = groupResult.rows[0].id;
			} catch (err) {
				if (err.code !== '23505') {
					throw err;
				}
			}
		}

		if (!groupId) {
			throw new Error('Invite-Code konnte nicht erzeugt werden.');
		}

		await client.query(
			`INSERT INTO group_users (group_id, user_id, role)
			 VALUES ($1, $2, 'admin')`,
			[groupId, userId]
		);

		await client.query('COMMIT');
		return res.redirect('/me?groupCreated=true');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Fehler beim Erstellen der Gruppe:', err);
		return res.status(500).send('Server Fehler');
	} finally {
		client.release();
	}
});

router.post('/join', checkAuth, formParser, async (req, res) => {
	const userId = req.session?.userId;
	const inviteCode = extractInviteCode(req.body.inviteCode);

	if (!userId) {
		return res.status(401).send('Nicht autorisiert');
	}

	if (!inviteCode) {
		return res.status(400).send('Ein gueltiger Einladungslink oder Code ist erforderlich.');
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		const groupResult = await client.query('SELECT id FROM groups WHERE invite_code = $1', [
			inviteCode
		]);

		if (groupResult.rows.length === 0) {
			await client.query('ROLLBACK');
			return res.status(404).send('Gruppe mit diesem Einladungslink wurde nicht gefunden.');
		}

		const groupId = groupResult.rows[0].id;

		const membershipResult = await client.query(
			`INSERT INTO group_users (group_id, user_id, role)
			 VALUES ($1, $2, 'member')
			 ON CONFLICT (group_id, user_id) DO NOTHING
			 RETURNING group_id`,
			[groupId, userId]
		);

		await client.query('COMMIT');

		if (membershipResult.rowCount === 0) {
			return res.redirect('/me?groupAlreadyJoined=true');
		}

		return res.redirect('/me?groupJoined=true');
	} catch (err) {
		await client.query('ROLLBACK');
		console.error('Fehler beim Beitritt zur Gruppe:', err);
		return res.status(500).send('Server Fehler');
	} finally {
		client.release();
	}
});

export default router;
