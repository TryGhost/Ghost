---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten Mal einzurichten.
permalink: /de/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---

# Installation auf Linux <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node installieren

* Sofern du nicht die [Installation mittels Paketverwaltung](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) bevorzugst, lade dir das  `.tar.gz`-Archiv von [http://nodejs.org](http://nodejs.org) herunter.
* Stelle sicher, dass du Node und npm installiert hast, indem du `node -v` und `npm -v` in einem Terminal eingibst

### Ghost installieren und ausführen

**Wenn du Linux als Desktop verwendest gehe wie folgt vor:**

* Klicke auf [der Download-Seite](https://ghost.org/download) auf den Button zum herunterladen der neuesten Zip-Datei und extrahiere sie an den Ort, von dem du Ghost starten willst

**Wenn du Linux als Gast-Betriebssystem verwendest oder über SHH und nur einen Terminal hast, dann:**

*   Benutze folgenden Befehl um die neueste Version von Ghost zu bekommen:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Entpacke das Archiv mit folgendem Befehl:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```

**Nachdem du Ghost erfolgreich entpackt hast, öffne einen Terminal, wenn noch nicht geöffnet, und fahre wie folgt fort:**

*   Wechsle in einem Terminal zu dem Pfad, in den du Ghost extrahiert hast, mit folgendem Befehl:

    ```
    $ cd /path/to/ghost
    ```

*   Installiere Ghost mit:

    ```
    npm install --production
    ```
    <span class="note">Achte auf die zwei Striche</span>

*   * Sobald npm fertig ist, starte Ghost im den Entwicklungsmodus mit:

    ```
    $ npm start
    ```

*   Ghost lauft nun unter **127.0.0.1:2368**<br />
    <span class="note">Du kannst die IP-Addresse und den Port in **config.js** anpassen</span>
*   Navigiere in einem Browser zu <code class="path">127.0.0.1:2368</code>, um deinen neuen Ghost Blog zu betrachten
*   Wechsel zu <code class="path">127.0.0.1:2368/ghost</code> und erstelle deinen Administrator-Benutzer, um dich im Ghost-Backend anzumelden
