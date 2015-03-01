---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten Mal einzurichten.
permalink: /de/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Installation auf Windows <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node installieren

* Klicke auf [http://nodejs.org](http://nodejs.org) auf INSTALL und lade die .msi-Datei herunter
* Öffne die Datei, dann startet ein Installationsprogramm, das sowohl node als auch npm installieren wird.
* Klicke dich durch die Installation bis dir mitgeteilt wird dass Node.js installiert wurde

Falls du nicht mehr weiter weißt, kannst du dir den [ganzen Prozess hier anschauen](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Ghost auf Windows installieren").

### Ghost herunterladen und extrahieren

* Klicke auf [der Download-Seite](https://ghost.org/download) auf den Button zum herunterladen der neuesten Zip-Datei.
* Klicke auf den Pfeil neben der heruntergeladenen Datei und wähle 'im Ordner anzeigen'.
* Sobald sich der Ordner öffnet, klicke rechts auf die heruntergeladene Zip-Datei und wähle 'Alle extrahieren'.

### Ghost installieren und ausführen

* Suche im Startmenü nach 'Node.js' und wähle 'Node.js Command Prompt'
* In der Kommandozeile musst du zum Verzeichnis wechseln, in das du Ghost entpackt hast. Der Befehl dafür lautet `cd Downloads/ghost-#.#.#` (ersetze die Rauten mit der Version von Ghost die du heruntergeladen hast)
* Gib nun `npm install --production` ein <span class="note">Achte auf die zwei Striche</span>
* Sobald npm fertig ist, starte Ghost mittels `npm start` in den Entwicklungsmodus
* Navigiere in einem Browser zu <code class="path">127.0.0.1:2368</code>, um deinen neuen Ghost Blog zu betrachten
* Ersetze die URL mit <code class="path">127.0.0.1:2368/ghost</code> und erstelle deinen Administrator-Benutzer, um dich im Ghost-Backend anzumelden
* Schau dir für die weiteren Schritte das [Nutzer-Handbuch](/usage) an

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

