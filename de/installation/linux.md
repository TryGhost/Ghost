---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten mal einzurichten.
permalink: /de/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---

# Installation auf Linux <a id="install-linux"></a>

### Node installieren

* Sofern du nicht die [Installation mittels Paketverwaltung](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) bevorzugst, lade dir das  `.tar.gz`-Archiv von [http://nodejs.org](http://nodejs.org) herunter.
* Stelle sicher, dass du Node und npm installiert hast, indem du `node -v` und `npm -v` in einem Terminal eingibst

### Ghost installieren und asuführen

* Logge dich auf [http://ghost.org](http://ghost.org) ein und klicke auf dem blauen 'Download Ghost Source Code' button.
* Klicke auf der Download-Seite auf den Button zum herunterladen der neuesten Zip-Datei und extrahiere sie an den Ort, von dem du Ghost starten willst
* Wechsle in einem Terminal zu dem Pfad, in den du Ghost extrahiert hast
* Gib nun `npm install --production` ein <span class="note">Achte auf die zwei Striche</span>
* Sobald npm fertig ist, starte Ghost mittels `npm start` in den Entwicklungsmodus
* Navigiere in einem Browser zu <code class="path">127.0.0.1:2368</code>, um deinen neuen Ghost Blog zu betrachten
* Ersetze die URL mit <code class="path">127.0.0.1:2368/ghost</code> und erstelle deinen Administrator-Benutzer, um dich im Ghost-Backend anzumelden

Falls du Linux als virtuelles Betriebssystem oder mittels SSH verwendest und nur ein Terminal zur verfügung hast, kannst du folgendes tun:

* Verwende dein normales Betriebssystem, um die URL der Zip-Datei herauszufinden (sie verändert sich mit jeder Version). Speichere die URL, ändere allerdings '/zip/' zu '/archives/' ab
* Verwende im Terminal `wget url-of-ghost.zip`, um Ghost herunterzuladen
* Entpacke das Archiv mit `unzip -uo Ghost-#.#.#.zip -d ghost` und gib dann `cd ghost` ein
* Gib nun `npm install --production` ein um Ghost zu installieren <span class="note">Achte auf die zwei Striche</span>
* Sobald npm fertig ist, starte Ghost mittels `npm start` in den Entwicklungsmodus
* Ghost läuft nun auf localhost
