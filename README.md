# SportMeet - Startanleitung fuer die Lehrkraft

Diese Anwendung wird als ZIP-Datei abgegeben. In der ZIP-Datei befindet sich die Datei `.env.example`. Die Datei `.env.example` muss in `.env` umbenannt werden.

Die lokalen PostgreSQL-Zugangsdaten und das `SESSION_SECRET` müssen in `.env` eingetragen werden. Der Brevo-API-Key wird separat im Abgabe-Ordner in Teams in der Datei `BREVO_API_KEY.docx` bereitgestellt und muss zusätzlich in `.env` eingetragen werden.

## Voraussetzungen

Bitte vorab installieren:

1. `Node.js`  
   Das Projekt wurde mit `Node.js v24.12.0` entwickelt und getestet. Empfohlen wird daher eine aktuelle `Node.js 24.x`-Version.  
   Download: [https://nodejs.org/](https://nodejs.org/)

2. `PostgreSQL`  
   Das Projekt wurde mit `PostgreSQL 18.3` entwickelt und getestet. Empfohlen wird daher eine aktuelle `PostgreSQL 18.x`-Version.  
   Windows-Installer über EDB: [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)

3. `npm`  
   `npm` ist der Paketmanager von `Node.js` und wird in der Regel zusammen mit `Node.js` installiert.

## Projekt entpacken

1. Die ZIP-Datei entpacken.
2. Ein Terminal im Projektordner öffnen.

## `.env` vorbereiten

1. Die Datei `.env.example` in `.env` umbenennen.
2. In der Datei `.env` nur die folgenden Werte anpassen:
   - `DB_PASSWORD`
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - optional `DB_PORT`, falls PostgreSQL lokal nicht auf `5432` läuft
3. Den Brevo-API-Key aus der Datei `BREVO_API_KEY.docx` im Abgabe-Ordner in Teams kopieren und in `.env` hinter `BREVO_API_KEY=` einfügen.

Wichtige Hinweise:

- Bei `DATABASE_URL` muss anstelle von `DEIN_DB_PASSWORT` das bei der PostgreSQL-Installation vergebene Passwort eingetragen werden.
- Bei `SESSION_SECRET` muss ein eigener beliebiger geheimer String eingetragen werden. Für den Test reicht zum Beispiel: `sportmeet-test-secret-2026`
- Der Brevo-API-Key aus `BREVO_API_KEY.docx` soll in `.env` hinter `BREVO_API_KEY=` eingefügt werden.
- Die übrigen Werte für Mail und Geocoding sind bereits in `.env.example` eingetragen und können beibehalten werden.

## PostgreSQL unter Windows installieren

1. PostgreSQL über EDB herunterladen und installieren.  
   Download: [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
2. Der Installer legt standardmäßig den PostgreSQL-Benutzer `postgres` an.
3. Während der Installation wird ein Passwort für diesen Benutzer festgelegt. Dieses Passwort bitte merken.
4. Standardport `5432` beibehalten.

Dieses Passwort muss später in `.env` bei `DB_PASSWORD` und in `DATABASE_URL` eingetragen werden.

## PostgreSQL-Verbindung prüfen

Nach der Installation kann die Verbindung über die Konsole geprüft werden:

```bash
psql -U postgres -h localhost -p 5432
```

Danach wird das bei der Installation gewählte Passwort abgefragt. Wenn die Anmeldung funktioniert, ist PostgreSQL korrekt erreichbar.

Falls `psql` in der Windows-Konsole nicht gefunden wird, ist der PostgreSQL-Ordner wahrscheinlich noch nicht in der Umgebungsvariable `PATH` eingetragen.

Typischer Installationspfad:

```text
C:\Program Files\PostgreSQL\18\bin
```

Unter Windows kann `PATH` in der Regel hier angepasst werden:

1. Startmenü öffnen
2. nach `Umgebungsvariablen` suchen
3. `Systemumgebungsvariablen bearbeiten` öffnen
4. `Umgebungsvariablen` öffnen
5. den Eintrag `Path` bearbeiten
6. den PostgreSQL-Ordner `...\PostgreSQL\18\bin` hinzufügen
7. das Terminal neu öffnen

Danach sollte dieser Befehl funktionieren:

```bash
psql --version
```

Nützliche Befehle in der PostgreSQL-Konsole:

```sql
\l
```

Zeigt alle vorhandenen Datenbanken an.

```sql
\c DATENBANKNAME
```

Verbindet mit einer bestimmten Datenbank.

```sql
\dt
```

Zeigt die Tabellen der aktuell ausgewählten Datenbank an.

Hinweis:

Die Datenbank `sportmeet_db` ist zu diesem Zeitpunkt normalerweise noch nicht vorhanden. Sie wird später automatisch erstellt.

## Datenbank vorbereiten

Die Anwendung erwartet lokal PostgreSQL mit diesen Standardwerten:

- Host: `localhost`
- Port: `5432`
- Benutzer: `postgres`
- Passwort: das bei der PostgreSQL-Installation vergebene Passwort
- Datenbankname: `sportmeet_db`

Die Datenbank `sportmeet_db` muss nicht manuell angelegt werden. Sie wird im nächsten Schritt automatisch erstellt.

Falls PostgreSQL lokal nicht auf Port `5432` läuft, muss der Wert `DB_PORT` in `.env` entsprechend angepasst werden.

## Projekt installieren

Im Projektordner ausführen:

```bash
npm install
```

Dieser Befehl installiert die in der Datei `package.json` definierten Abhängigkeiten des Projekts.

## Datenbank initialisieren

Danach bitte ausführen:

```bash
npm run db:init
```

Dieser Befehl erstellt die Datenbank `sportmeet_db` und führt die Migrationen aus.

Optional können anschließend Startdaten eingespielt werden:

```bash
npm run db:seed:all
```

## Beispielnutzer

Nach `npm run db:seed:all` stehen bereits Testkonten zur Verfügung:

- `tony.n@gso.schule.koeln`
- `test@user1.de`
- `test@user2.de`
- `test@user3.de`
- `test@user4.de`
- `test@user5.de`

Passwort für alle Seed-Nutzer:

`Admin123!`

Alternativ können neue Konten direkt über die Registrierungsseite erstellt werden.

## Anwendung starten

Unter Windows wird empfohlen, die Anwendung mit `npm start` zu starten:

```bash
npm start
```

Danach ist die Anwendung erreichbar unter:

[http://localhost:3000](http://localhost:3000)

## E-Mail und externe Dienste

Die Anwendung nutzt bereits konfigurierte externe Dienste für:

- E-Mail-Versand über **Brevo**
- Geocoding über **Nominatim** / **OpenStreetMap**

Für den E-Mail-Versand über **Brevo** muss der API-Key aus `BREVO_API_KEY.docx` im Abgabe-Ordner in Teams in `.env` hinter `BREVO_API_KEY=` eingetragen werden. Dadurch ist keine eigene Einrichtung nötig.

Falls der Mailversand in der lokalen Umgebung trotzdem nicht funktioniert, kann die Anwendung dennoch vollständig getestet werden. Die Kernfunktionen wie Registrierung, Login, Gruppen, Termine, Teilnahme und Kommentare laufen unabhängig davon.

## Falls der Start nicht funktioniert

Bitte folgende Punkte prüfen:

1. Ist PostgreSQL installiert und erreichbar?
2. Funktioniert `psql -U postgres -h localhost -p 5432`?
3. Wurde `.env.example` in `.env` umbenannt?
4. Wurden `DB_PASSWORD`, `DATABASE_URL` und `SESSION_SECRET` in `.env` eingetragen?
5. Wurde der Brevo-API-Key aus `BREVO_API_KEY.docx` in `.env` hinter `BREVO_API_KEY=` eingefügt?
6. Wurde `npm install` ausgeführt?
7. Wurde `npm run db:init` ausgeführt?
8. Wurde die Anwendung mit `npm start` gestartet?

## Kurzzusammenfassung

Die wichtigsten Befehle:

```bash
npm install
npm run db:init
npm run db:seed:all
npm start
```

Danach im Browser:

[http://localhost:3000](http://localhost:3000)

Falls es nicht gelingt, das Projekt lokal zum Laufen zu bringen, kann die Anwendung alternativ über die bereitgestellte Serverinstanz getestet werden:

[http://173.212.205.154:3000/](http://173.212.205.154:3000/)
