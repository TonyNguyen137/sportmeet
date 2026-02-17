import pgtools from 'pgtools';
import config from '../server/config.js';

const dbConfig = {
	user: config.user,
	password: config.password,
	port: config.dbPort,
	host: config.host
};

async function setup() {
	console.log(
		`Versuche Datenbank "${config.database}" auf Port ${config.dbPort} zu erstellen...`
	);

	try {
		// Wir nutzen die Promise-Variante von createdb
		await pgtools.createdb(dbConfig, config.database);
		console.log(`🎉 Datenbank "${config.database}" wurde erfolgreich neu erstellt!`);
	} catch (err) {
		// Hier fangen wir den "duplicate_database" Fehler ab
		if (err.pgErrCode === '42P04' || (err.cause && err.cause.code === '42P04')) {
			console.log(
				`✅ Info: Datenbank "${config.database}" existiert bereits. Alles okay.`
			);
		} else {
			console.error('❌ Schwerwiegender Fehler beim DB-Setup:', err.message);
			process.exit(1); // Nur bei echten Fehlern (falsches Passwort etc.) abbrechen
		}
	}

	// WICHTIG: Wir beenden den Prozess sauber mit 0, damit npm run migrate:up starten kann
	process.exit(0);
}

setup();
