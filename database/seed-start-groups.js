import pool from '../server/model/db.js';

const START_GROUPS = [
	{
		name: 'Fußbal Warriors',
		description: 'Lockere Fussballrunde fuer gemeinsame Spiele, Trainings und spontane Termine in Koeln.',
		inviteCode: 'SM-FUSSBAL26',
		adminEmail: 'tony.n@gso.schule.koeln',
		memberEmails: ['test@user2.de', 'test@user3.de', 'test@user4.de', 'test@user5.de']
	}
];

const findUserIdByEmail = async (client, email) => {
	const result = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
	return result.rows[0]?.id ?? null;
};

const seedStartGroups = async () => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		for (const group of START_GROUPS) {
			const adminUserId = await findUserIdByEmail(client, group.adminEmail);

			if (!adminUserId) {
				throw new Error(`Admin-User nicht gefunden: ${group.adminEmail}`);
			}

			const insertGroupResult = await client.query(
				`INSERT INTO groups (name, description, invite_code, created_by)
				 SELECT $1::varchar(120), $2::text, $3::varchar(32), $4::bigint
				 WHERE NOT EXISTS (
				 	SELECT 1
				 	FROM groups
				 	WHERE name = $1::varchar(120)
				 	  AND created_by = $4::bigint
				 )
				 RETURNING id`,
				[group.name, group.description, group.inviteCode, adminUserId]
			);

			const groupId =
				insertGroupResult.rows[0]?.id ??
				(
					await client.query(
						`SELECT id
						 FROM groups
						 WHERE name = $1::varchar(120)
						   AND created_by = $2::bigint
						 LIMIT 1`,
						[group.name, adminUserId]
					)
				).rows[0]?.id;

			if (!groupId) {
				throw new Error(`Gruppe konnte nicht angelegt werden: ${group.name}`);
			}

			await client.query(
				`INSERT INTO group_users (group_id, user_id, role)
				 VALUES ($1, $2, 'admin')
				 ON CONFLICT (group_id, user_id) DO UPDATE SET role = 'admin'`,
				[groupId, adminUserId]
			);

			for (const memberEmail of group.memberEmails) {
				const memberUserId = await findUserIdByEmail(client, memberEmail);

				if (!memberUserId) {
					throw new Error(`Mitglied nicht gefunden: ${memberEmail}`);
				}

				await client.query(
					`INSERT INTO group_users (group_id, user_id, role)
					 VALUES ($1, $2, 'member')
					 ON CONFLICT (group_id, user_id) DO NOTHING`,
					[groupId, memberUserId]
				);
			}
		}

		await client.query('COMMIT');
		console.log('Start-Gruppen wurden erfolgreich angelegt.');
	} catch (error) {
		await client.query('ROLLBACK');
		console.error('Fehler beim Seed der Start-Gruppen:', error);
		process.exitCode = 1;
	} finally {
		client.release();
		await pool.end();
	}
};

seedStartGroups();
