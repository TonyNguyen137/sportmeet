import pool from '../server/model/db.js';

const START_USERS = [
	{
		firstName: 'Test',
		lastName: 'User1',
		email: 'test@user1.de'
	},
	{
		firstName: 'Test',
		lastName: 'User2',
		email: 'test@user2.de'
	},
	{
		firstName: 'Test',
		lastName: 'User3',
		email: 'test@user3.de'
	},
	{
		firstName: 'Test',
		lastName: 'User4',
		email: 'test@user4.de'
	},
	{
		firstName: 'Test',
		lastName: 'User5',
		email: 'test@user5.de'
	}
];

// bcrypt hash for: Admin123!
const DEFAULT_PASSWORD_HASH =
	'$2b$10$2pI9xEUty0TYZA3SeIirCupABrSPfmGBBHW5WqSDr7lEYTXnTRL0G';

const seedStartUsers = async () => {
	try {
		for (const user of START_USERS) {
			await pool.query(
				`INSERT INTO users (first_name, last_name, email, password_hash)
				 VALUES ($1, $2, $3, $4)
				 ON CONFLICT (email) DO NOTHING`,
				[user.firstName, user.lastName, user.email, DEFAULT_PASSWORD_HASH]
			);
		}

		console.log('Start-User wurden erfolgreich angelegt.');
	} catch (error) {
		console.error('Fehler beim Seed der Start-User:', error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
};

seedStartUsers();
