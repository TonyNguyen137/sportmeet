# Qualitaetsnachweise

## Performance

Zur Ueberpruefung der Performance wurden mehrere Lasttests mit jeweils `100` gleichzeitigen Anfragen durchgefuehrt. Jeder Test lief `30 Sekunden` lang und wurde lokal mit `autocannon` gegen zentrale Routen der Anwendung ausgefuehrt. Getestet wurden die oeffentliche Startseite `/`, die geschuetzte Termin-Detailseite `/events/4`, das Nutzer-Dashboard `/me` sowie die Gruppenseite `/groups/2`.

Verwendete Befehle:

```bash
npx autocannon -c 100 -d 30 http://localhost:3000/
npx autocannon -c 100 -d 30 -H "Cookie: sportmeet_sid=DEIN_COOKIE_WERT" http://localhost:3000/events/4
npx autocannon -c 100 -d 30 -H "Cookie: sportmeet_sid=DEIN_COOKIE_WERT" http://localhost:3000/me
npx autocannon -c 100 -d 30 -H "Cookie: sportmeet_sid=DEIN_COOKIE_WERT" http://localhost:3000/groups/2
```

### Ergebnis

| Endpunkt    | Nutzer | Dauer | Durchschnittliche Latenz | 99%-Latenz | Requests/Sekunde | Fehler | Timeouts |
| ----------- | -----: | ----: | -----------------------: | ---------: | ---------------: | -----: | -------: |
| `/`         |    100 |  30 s |                 43.72 ms |      58 ms |          2260.87 |      0 |        0 |
| `/events/4` |    100 |  30 s |                 87.01 ms |     115 ms |          1140.37 |      0 |        0 |
| `/me`       |    100 |  30 s |                 167.5 ms |     190 ms |           593.04 |      0 |        0 |
| `/groups/2` |    100 |  30 s |                 67.39 ms |      81 ms |          1471.24 |      0 |        0 |

Zusaetzlich wurden folgende Kennzahlen gemessen:

- Startseite `/`
  - Median-Latenz: `43 ms`
  - Maximale Latenz: `270 ms`
  - Datendurchsatz: `14 MB/s`
- Termin-Detailseite `/events/4`
  - Authentifizierung: eingeloggte Session ueber `sportmeet_sid`
  - Median-Latenz: `86 ms`
  - Maximale Latenz: `277 ms`
  - Datendurchsatz: `16 MB/s`
- Nutzer-Dashboard `/me`
  - Authentifizierung: eingeloggte Session ueber `sportmeet_sid`
  - Median-Latenz: `166 ms`
  - Maximale Latenz: `273 ms`
  - Datendurchsatz: `18.7 MB/s`
- Gruppenseite `/groups/2`
  - Authentifizierung: eingeloggte Session ueber `sportmeet_sid`
  - Median-Latenz: `66 ms`
  - Maximale Latenz: `162 ms`
  - Datendurchsatz: `14.7 MB/s`

Bewertung:

Die Anwendung blieb waehrend der Tests stabil und erreichbar. Die Startseite erreichte bei `100` gleichzeitigen Anfragen eine durchschnittliche Antwortzeit von `43.72 ms` und eine `99%-Latenz` von `58 ms`. Die geschuetzte Termin-Detailseite `/events/4` zeigte unter derselben Last ein stabiles Verhalten mit einer durchschnittlichen Antwortzeit von `87.01 ms` und einer `99%-Latenz` von `115 ms`. Das eingeloggte Nutzer-Dashboard `/me` blieb ebenfalls stabil und erreichte eine durchschnittliche Antwortzeit von `167.5 ms` bei einer `99%-Latenz` von `190 ms`. Auch die Gruppenseite `/groups/2` blieb unter Last stabil und erreichte eine durchschnittliche Antwortzeit von `67.39 ms` bei einer `99%-Latenz` von `81 ms`. Waehrend aller Tests traten keine Fehler und keine Timeouts auf.

## Risiken und Gegenmassnahmen

Ein technisches Risiko besteht in der Abhaengigkeit von externen Diensten. Die Anwendung nutzt **Brevo** fuer den Versand von E-Mails sowie **Nominatim** auf Basis von **OpenStreetMap** fuer Geocoding-Funktionen. Falls einer dieser Dienste voruebergehend nicht verfuegbar ist, koennen Teilfunktionen wie Erinnerungs-E-Mails oder die Adressaufloesung eingeschraenkt sein.

Die Kernfunktionen der Anwendung bleiben davon jedoch weitgehend unberuehrt. Zur Risikominimierung werden externe Aufrufe kontrolliert eingebunden und Fehlerfaelle abgefangen, sodass die Anwendung auch bei Ausfall einzelner externer Dienste stabil weiterlaufen kann. Zudem wurde die Nutzung dieser Dienste transparent in der Datenschutzerklaerung dokumentiert.

## Datensicherheit und Datenschutz

Die Anwendung verarbeitet personenbezogene Daten nach dem Prinzip der Datenminimierung. Fuer die Nutzung der Plattform werden nur die technisch erforderlichen Informationen gespeichert, insbesondere Vorname, Nachname, E-Mail-Adresse und ein Passwort-Hash.

Passwoerter werden nicht im Klartext gespeichert, sondern gehasht in der Datenbank abgelegt. Dadurch wird das Risiko reduziert, dass Zugangsdaten bei einem unbefugten Datenzugriff direkt ausgelesen werden koennen.

<figure>

![Screenshot eines gehashten Passworts in der Datenbank](docs/images/password-hash.png)

<figcaption>Abbildung: Beispielhafter Datenbankeintrag mit gehasht gespeichertem Passwort anstelle eines Klartext-Passworts.</figcaption>
</figure>

Im Bereich Datenschutz wurde die Anwendung so dokumentiert, dass die tatsaechliche technische Umsetzung nachvollziehbar bleibt. Externe Dienste werden nur eingesetzt, wenn sie fuer den Betrieb notwendig sind. Dazu gehoeren **Brevo** fuer den Versand von E-Mails sowie **Nominatim** auf Basis von **OpenStreetMap** fuer Geocoding-Funktionen. Diese Nutzung ist in der Datenschutzerklaerung transparent beschrieben.

Fuer die Anzeige oeffentlicher Termine im Umkreis von `10 km` wird zusaetzlich die **Geolocation-Funktion des Browsers** verwendet. Die Standortabfrage erfolgt nur nach **ausdruecklicher Zustimmung des Nutzers** und dient **ausschliesslich** dazu, oeffentliche Termine in der naeheren Umgebung zu ermitteln.

Zusätzlich wurde die Funktion zur Kontoloeschung umgesetzt. Nutzer koennen ihr Konto loeschen, wobei personenbezogene Daten aus dem System entfernt werden, soweit sie nicht mehr fuer technische Konsistenz innerhalb der Anwendung benoetigt werden.

Bewertung:

Die Anforderungen an Datensicherheit und Datenschutz sind fuer den Projektumfang erfuellt. Besonders relevant sind dabei die gehashte Speicherung von Passwoertern, die transparente Dokumentation externer Dienste sowie die Moeglichkeit zur Kontoloeschung.
