---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten Mal einzurichten.
permalink: /de/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installation auf einem Mac <a id="install-mac"></a>

<p class="note"><strong>Hinweis</strong> Ghost benötigt Node.js <strong>0.10.x</strong> (latest stable). Wir empfehlen Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Um Node.js auf deinem Mac zu installieren, wirst du ein Terminal brauchen. Um dieses zu starten, öffne Spotlight und gib "Terminal" ein.

### Node installieren

* Klicke auf [http://nodejs.org](http://nodejs.org) auf INSTALL und lade die .pkg-Datei herunter
* Öffne die Datei, dann startet ein Installationsprogramm, das sowohl node als auch npm installieren wird.
* Klicke dich durch das Installationsprogramm, gib dein Passwort ein und wähle 'Software installieren'
* Sobald die Installation abgeschlossen ist, öffne dein Terminal und stelle mit dem Befehl `echo $PATH` sicher, dass sich '/usr/local/bin/' in deiner Umgebungsvariable befindet.

<p class="note"><strong>Anmerkung:</strong> Falls '/usr/local/bin' nicht in der $PATH-Variable enthalten ist, zeigen dir die <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">Problembehebungs-Tipps</a>, wie du ihn hinzufügst</p>

Falls du nicht mehr weiter weißt, kannst du dir den [ganzen Prozess hier anschauen](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Ghost auf einem Mac installieren").

### Ghost installieren und ausführen

* Klicke auf [der Download-Seite](https://ghost.org/download) auf den Button zum herunterladen der neuesten Zip-Datei.
* Klicke auf den Pfeil neben der heruntergeladenen Datei und wähle 'In Finder anzeigen'.
* Kicke im Finder doppelt auf die heruntergeladene Zip-Datei und extrahiere sie
* Ziehe den extrahierten 'ghost-#.#.#'-Ordner in die Titelleiste deines offenen Terminal-Fensters, das wird ein Tab in dem richtigen Verzeichnis öffnen
* Gib in dem neuen Tab nun den Befehl `npm install --production` ein <span class="note">Achte auf die zwei Striche</span>
* Sobald npm fertig ist, starte Ghost mittels `npm start` in den Entwicklungsmodus
* Navigiere in einem Browser zu <code class="path">127.0.0.1:2368</code>, um deinen neuen Ghost Blog zu betrachten
* Ersetze die URL mit <code class="path">127.0.0.1:2368/ghost</code> und erstelle deinen Administrator-Benutzer, um dich im Ghost-Backend anzumelden
* Schau dir für die weiteren Schritte das [Nutzer-Handbuch](/usage) an

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

