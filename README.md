# K+ Coder

Python, HTML, CSS und JavaScript direkt im Browser schreiben: [coder.k-plus.one](https://coder.k-plus.one).

Die Seite ist eine statische Website. Cloudflare liefert nur Dateien aus und führt kein Worker-Skript aus. Python läuft im Browser des Besuchers, nicht auf einem Server.

## Was die Seite kann

- Python, HTML, CSS, JavaScript, JSON, XML, Markdown und Text schreiben
- Python im Browser ausführen und mit Ruff prüfen
- HTML, CSS und JavaScript prüfen, auch Skript und Stil in einer HTML-Datei
- Dateien und Ordner anlegen; sie bleiben in IndexedDB in diesem Browser
- den gesamten Workspace als `python-workspace.py` herunterladen; der Import ersetzt die Datenbank nach einer Rückfrage
- einen Dateiinhalt als Link teilen
- vor dem Schließen warnen, solange eine Änderung noch nicht gespeichert ist

`Cmd/Strg + Enter` führt den Code aus. `Cmd/Strg + S` lädt die geöffnete Datei herunter.

## Cloudflare

`wrangler.jsonc` hat kein `main` und kein Asset-Binding. Damit ist das Projekt assets-only: der Asset-Router beantwortet die Anfragen, inklusive der SPA-Rückfallseite auf `index.html`. Solche Anfragen sind statische Assets. Bei Cloudflare sind sie kostenlos und unbegrenzt und zählen nicht gegen das Request-Limit eines Worker-Skripts.

Ein eigenes Worker-Skript würde Anfragen abrechenbar machen. Deshalb bleibt die Konfiguration ohne `main`.

`python.k-plus.one` zeigt die Seite nicht mehr. `redirect/` ist ein eigener Worker, der dort nur mit 301 auf dieselbe Adresse unter `coder.k-plus.one` antwortet. Die Seite selbst bleibt ohne Worker-Skript.

Die Python-Laufzeit (Pyodide 314.0.7, inklusive Standardbibliothek) liegt unter `/pyodide/` und wird mit der Seite ausgeliefert. Ruff ebenfalls. Beides ist ein Abruf derselben Website, kein Aufruf eines Cloudflare-Workers. Python-Code und Dateien werden nicht an einen Anwendungsserver gesendet.

Im Browser fehlen normale Prozesse und native Threads. Ein Lauf endet nach 15 Sekunden oder beim Stopp; der Python-Worker wird danach neu aufgebaut.

## Teilen

Der Teilen-Button erzeugt eine URL in dieser Form:

```text
https://coder.k-plus.one/?import#<lz-komprimierter-code>
```

Der Query-Parameter ist nur das Import-Kennzeichen. Der komprimierte Code steht im Fragment hinter `#` und geht damit nicht an den Webserver. Ab 8.000 Zeichen in der URL wird stattdessen die Datei heruntergeladen. Der Inhalt ist komprimiert, aber nicht verschlüsselt.

## Lokal starten

```sh
npm install
npm run dev
```

Prüfen und bauen:

```sh
npm run check
npm run lint
npm test
npm run test:e2e
npm run build
npx wrangler deploy
npx wrangler deploy -c redirect/wrangler.jsonc
```

`npm run build` schreibt die statische Seite nach `build/`. `npx wrangler deploy` veröffentlicht genau dieses Verzeichnis.

## Lizenz

[MIT](LICENSE). Jede Person darf den Code kopieren, ändern, zusammenführen und weitergeben, auch in eigenen Projekten. Erhalten bleiben müssen der Urheberhinweis und dieser Lizenztext.
