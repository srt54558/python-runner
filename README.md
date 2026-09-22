# Python Runner

Python direkt im Browser schreiben und ausführen: [python.k-plus.one](https://python.k-plus.one).

Die Seite ist eine statische Website. Cloudflare liefert nur Dateien aus und führt kein Worker-Skript aus. Python läuft im Browser des Besuchers, nicht auf einem Server.

## Was die Seite kann

- Python-Code schreiben, mit Einrückung nach einem Block wie `if hi:`
- den Code im Browser ausführen und mit Ruff prüfen
- Dateien und Ordner anlegen; sie bleiben in IndexedDB in diesem Browser
- den gesamten Workspace als `python-workspace.json` herunterladen
- einen Dateiinhalt als Link teilen
- vor dem Schließen warnen, solange eine Änderung noch nicht gespeichert ist

`Cmd/Strg + Enter` führt den Code aus. `Cmd/Strg + S` lädt die geöffnete Datei herunter.

## Cloudflare

`wrangler.jsonc` hat kein `main` und kein Asset-Binding. Damit ist das Projekt assets-only: der Asset-Router beantwortet die Anfragen, inklusive der SPA-Rückfallseite auf `index.html`. Solche Anfragen sind statische Assets. Bei Cloudflare sind sie kostenlos und unbegrenzt und zählen nicht gegen das Request-Limit eines Worker-Skripts.

Ein eigenes Worker-Skript würde Anfragen abrechenbar machen. Deshalb bleibt die Konfiguration ohne `main`.

Der Browser lädt die Python-Laufzeit einmalig von jsDelivr (`cdn.jsdelivr.net`, Pyodide 314.0.7). Das ist ein Abruf im Browser, kein Aufruf eines Cloudflare-Workers. Ruff läuft als WebAssembly, das mit der Seite ausgeliefert wird. Python-Code und Dateien werden nicht an einen Anwendungsserver gesendet.

Pyodide kann die Standardbibliothek und passende Pakete laden. Im Browser fehlen normale Prozesse und native Threads. Der erste Start braucht eine Netzwerkverbindung, damit die Laufzeit geladen werden kann. Ein Lauf endet nach 15 Sekunden oder beim Stopp; der Python-Worker wird danach neu aufgebaut.

## Teilen

Der Teilen-Button erzeugt eine URL in dieser Form:

```text
https://python.k-plus.one/?import#<lz-komprimierter-code>
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
npm run build
npx wrangler deploy
```

`npm run build` schreibt die statische Seite nach `build/`. `npx wrangler deploy` veröffentlicht genau dieses Verzeichnis.

## Lizenz

[MIT](LICENSE). Jede Person darf den Code kopieren, ändern, zusammenführen und weitergeben, auch in eigenen Projekten. Erhalten bleiben müssen der Urheberhinweis und dieser Lizenztext.
