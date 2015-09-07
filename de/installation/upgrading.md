---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten Mal einzurichten.
permalink: /de/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
canonical: http://support.ghost.org/how-to-upgrade/
redirectToCanonical: true
---

# Ghost aktualisieren <a id="upgrade"></a>

Ghost zu aktualisieren ist sehr einfach.

Es gibt verschiedene Wege, dies anzugehen. Im folgenden wird beschrieben was getan werden muss und der Prozess jeweils über eine grafische Oberfläche und die [Kommandozeile](#cli) im Detail beschrieben. Dir steht es frei, den Weg zu wählen, der dir am besten liegt.

<p class="note"><strong>Erstelle Backups!</strong> Erstelle vor der Aktualisierung immer ein Backup. Lies die <a href="#backing-up">Backup-Anleitung</a> zuerst!</p>

## Übersicht


<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Sobald Ghost installiert ist, sollte die Orderstruktur ähnlich zu der auf der linken Seite sein. Es gibt zwei Hauptverzeichnisse, <code class="path">content</code> und <code class="path">core</code>, sowie einige Dateien im Überverzeichnis.

Bei der Aktualisierung müssen die alten Dateien mit den neuen ersetzt und `npm install` zum aktualisieren des <code class="path">node_modules</code>-Ordners ausgeführt werden. Damit diese Änderungen angewendet werden, muss Ghost dann noch neugestartet werden. 

Denke daran, dass Ghost standardmäßig deine eigenen Daten, Themes, Bilder, etc. im Verzeichnis <code class="path">content</code> speichert, versuche dieses zu schützen! Ersetze ausschließlich Dateien in <code class="path">core</code> und im Überverzeichnis, dann sollte nichts schief gehen.


## Backup erstellen <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

* Um deine Daten aus der Datenbank zu sichern, logge dich in deine Ghost Installation ein und gehe zu <code class="path">/ghost/debug/</code>. Der Export-Button wird dir eine JSON-Datei mit allen deinen Daten liefern. Fertig!
* Um deine Themes und Bilder zu sichern, musst du eine Kopie der Dateien innerhalb <code class="path">content/themes</code> und <code class="path">content/images</code> anfertigen.
<p class="note"><strong>Hinweis:</strong> Wenn du magst, kannst du eine Kopie der Datenbank in <code class="path">content/data</code> anfertigen, <strong>bitte beachte aber</strong> dass du Ghost vorher stoppen solltest und diesen nicht im laufenden Betrieb kopieren darfst.</p>

## Aktualisierung durchführen <a id="how-to"></a>

Wie du die Aktualisierung auf deinem lokalen Rechner durchführst


<p class="warn"><strong>WARNUNG:</strong> Kopiere auf einem Mac <strong>NICHT</strong> den gesamten Ghost-Ordner über eine bestehende Installation. Wenn du die Dateien mit Transmit oder einem anderen FTP-Programm hochlädst, wähle <strong>NICHT</strong> <kbd>ERSETZEN</kbd>, wähle <kbd>ZUSAMMENLEGEN</kbd>.</p>

* Lade die neueste Version von Ghost von [Ghost.org](http://ghost.org/download/) herunter
* Extrahiere die Zip-Datei in ein temporäres Verzeichnis
* Kopiere alle Dateien im Überverzeichnis aus der neuen Version. Diese beinhalten: index.js, package.json, Gruntfile.js, config.example.js, die Lizenz- und Readme-Dateien.
* Lösche das alte <code class="path">core</code>-Verzeichnis und setze dann das neue <code class="path">core</code>-Verzeichnis an diese Stelle.
* Für Veröffentlichungen die eine aktualisierte Version von Casper (dem Standard-Theme) beinhalten, lösche das alte <code class="path">content/themes/casper</code>-Verzeichnis und setze das neue an diese Stelle
* Führe `npm install --production` aus
* Starte Ghost neu, um die Änderungen anzuwenden.

## Kommandozeile <a id="cli"></a>

<p class="note"><strong>Erstelle Backups!</strong> Erstelle vor der Aktualisierung immer ein Backup. Lies die <a href="#backing-up">Backup-Anleitung</a> zuerst!</p>

### Kommandozeile auf einem Mac <a id="cli-mac"></a>

Die Bildschirmaufnahme unten zeigt die Schritte für eine Aktualisierung. Dabei wurde die Zip-Datei nach <code class="path">~/Downloads</code> heruntergeladen und Ghost unter <code class="path">~/ghost</code> installiert. <span class="note">**Hinweis:** `~` steht unter Mac und Linux für das Benutzerverzeichnis</span>

![Aktualisiere Ghost](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

Die gezeigten Schritte sind:

*   <code class="path">cd ~/Downloads</code> - Wechseln in das Verzeichnis wo die neueste Version von Ghost gespeichert wurde
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - Entpacken von Ghost in den Ordner <code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - Wechseln in das <code class="path">ghost-0.4.0</code>-Verzeichnis
*   `ls` - Zeige alle Dateien im aktuellen Verzeichnis
*   `cp *.js *.json *.md LICENSE ~/ghost` - Kopiere alle .md .js .txt und .json Dateien in das Verzeichnis <code class="path">~/ghost</code>
*	`rm -rf ~/ghost/core` - Lösche das alte <code class="path">core</code>-Verzeichnis
*   `cp -R core ~/ghost` - Kopiere das <code class="path">core</code>-Verzeichnis und alle Inhalte nach <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - Kopiere das <code class="path">casper</code>-Verzeichnis und alle Inhalte nach <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - Wechsle in das <code class="path">~/ghost</code>-Verzeichnis
*   `npm install --production` - Installiere Ghost
*   `npm start` - Starte Ghost

### Kommandozeile auf einem Linux-Server <a id="cli-server"></a>

* Als Erstes musst du die URL mit der neuesten Ghost-Version herausfinden. Sie dürfte `http://ghost.org/zip/ghost-latest.zip` sein.
* Lade die Zip-Datei mittels `wget http://ghost.org/zip/ghost-latest.zip` herunter (oder mit der URL die für die neueste Ghost-Version steht).
* Lösche das alte core-Verzeichnis von deiner Installation
* Entpacke das Archiv mit `unzip -uo ghost-latest.*.zip -d Pfas-zu-deiner-Ghost-Installation`
* Führe `npm install --production` aus, um alle neuen Abhängigkeiten zu installieren
* Starte Ghost neu, um alle Änderungen anzuwenden

**Weiterhin** bietet [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) auch Instruktionen, wie man Ghost auf Linux-Servern aktualisiert.

### Ein DigitalOcean Droplet aktualisieren <a id="digitalocean"></a>

<p class="note"><strong>Erstelle Backups!</strong> Erstelle vor der Aktualisierung immer ein Backup. Lies die <a href="#backing-up">Backup-Anleitung</a> zuerst!</p>

* Als erstes musst du die URL mit der neuesten Ghost-Version herausfinden. Sie dürfte `http://ghost.org/zip/ghost-latest.zip` sein.
* Sobald du die URL hast, wechselst du in der Droplet-Konsole mittels `cd /var/www/` in das Verzeichnis deiner Ghost-Installation
* Entferne das alte core-Verzeichnis mit `rm -rf ghost/core`
* Entpacke das Archiv mit `unzip -uo ghost-0.4.*.zip -d ghost`
* Stelle sicher dass alle Dateirechte korrekt sind: `chown -R ghost:ghost ghost/*`
* Wechsle in das <code class="path">ghost</code>-Verzeichnis mit `cd ghost`
* Führe `npm install --production` aus, um alle neuen Abhängigkeiten zu installieren
* Starte Ghost mit `service ghost restart` neu, um alle Änderungen anzuwenden


## Node.js auf die neueste Version aktualisieren <a id="upgrading-node"></a>

Falls du Ghost von der [Node.js](nodejs.org)-Webseite installiert hast, kannst du auf die neueste Version aktualisieren indem du sie dort herunterlädst und wieder das Installationsprogramm ausführst. Das wird deine aktuelle Version mit der neuesten ersetzen.

Falls du Ubuntu oder eine andere Linux-Distribution mit `apt-get` verwendest, ist der Befehl zur Aktualisierung der gleiche wie zur Installation: `sudo apt-get install nodejs`.

Ein Neustart des Servers oder von Ghost ist **nicht** notwendig.
