import pool from '../server/model/db.js';

const DEFAULT_SPORTS = [
	'Badminton',
	'Basketball',
	'Fitness/Gym',
	'Fussball',
	'Joggen/Laufen',
	'Klettern',
	'Radfahren',
	'Schwimmen',
	'Tennis',
	'Tischtennis',
	'Volleyball',
	'Wandern',
	'Yoga'
];

const seedDefaultSports = async () => {
	try {
		for (const sportName of DEFAULT_SPORTS) {
			await pool.query(
				`INSERT INTO sports (name)
				 VALUES ($1)
				 ON CONFLICT (name) DO NOTHING`,
				[sportName]
			);
		}

		console.log('Standard-Sportarten wurden erfolgreich angelegt.');
	} catch (error) {
		console.error('Fehler beim Seed der Standard-Sportarten:', error);
		process.exitCode = 1;
	} finally {
		await pool.end();
	}
};

seedDefaultSports();
