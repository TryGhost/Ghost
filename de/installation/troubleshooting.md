---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten Mal einzurichten.
permalink: /de/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---

# Problembehebung & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' ist nicht in $PATH</dt>
    <dd>Du kannst den Pfad hinzufügen, indem du folgendes tust:
        <ul>
            <li>Gib in deinem Terminal <code>cd ~</code> ein, das wechselt in dein Home-Verzeichnis</li>
            <li>Nun kannst du <code>ls -al</code> ausführen, um alle, inklusive der versteckten, Dateien und Ordner anzuzeigen</li>
            <li>Darunter sollte sich die Datei <code class="path">.profile</code> oder <code class="path">.bash_profile</code> befinden, ansonsten lege sie mit <code>touch .bash_profile</code> an</li>
            <li>Gib als nächstes <code>open -a Textedit .bash_profile</code> ein, um sie mit Textedit zu öffnen</li>
            <li>Füge <code>export PATH=$PATH:/usr/local/bin/</code> am Ende der Datei ein und speichere sie</li>
            <li>Die neue Einstellung wird erst geladen, wenn ein neues Terminal gestartet wird, also öffne ein neues und gib dann <code>echo $PATH</code> ein um sicherzustellen dass '/usr/local/bin/' nun angezeigt wird.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 kann nicht installiert werden</dt>
    <dd>
        <p>Das SQLite3-Paket kommt mit vorkompilierten Binärdateien für die meisten Architekturen. Falls du eine weniger bekanntest Linux oder eine andere Unix-Variante verwendest, kann es sein dass SQLite3 dir einen 404-Fehler zurückgibt da es die Binärdatei nicht für deine Plattform finden kann</p>
        <p>Das kann behoben werden, indem man SQlite3 zum kompilieren zwingt. Das erfordert Python und GCC. Versuche es mit <code>npm install sqlite3 --build-from-source</code></p>
        <p>Falls es nicht kompiliert, fehlen dir vermutlich einer der Abhängigkeiten zu Python oder GCC. Unter Linux kannst du <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> und <code>sudo apt-get install python-software-properties python g++ make</code> versuchen und dann das kompilieren erneut starten.</p>
        <p>Für mehr Informationen über das kompilieren von Binärdateien schaue dir bitte <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a> an.</p>
        <p>Sobald du die Binärdatien für deine Plattform erfolgreich kompiliert hast, folge bitte den <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">Instruktionen hier</a> um die Dateien an das node-sqlite-Projekt zu senden, damit andere Nutzer nach dir nicht das selbe Problem haben werden.</p>
    </dd>
    <dt id="image-uploads">Ich kann keine Bilder hochladen</dt>
    <dd>
        <p>Falls du eine DigitalOcean Droplet Installation, die noch mit Ghost v0.3.2 kommt, oder unter einigen Plattformen nginx verwendest, könnte es sein dass du keine Bilder hochladen kannst.</p>
        <p>Das eigentliche Problem ist dass du keine Bilder hochladen kannst, die Größer als 1MB sind. Kleiner Bilder sollten möglich sein, jedoch ist das ein sehr niedriges Limit.</p>
        <p>Um das Limit zu erhöhen, musst du die nginx Konfiguration modifizieren und es auf einen anderen Wert setzen.</p>
        <ul>
            <li>Logge dich auf deinem Server ein und gib <code>sudo nano /etc/nginx/conf.d/default.conf</code>ein um die Konfigurationsdatei zu öffnen.</li>
            <li>Füge nach <code>server_name</code> folgendes hinzu: <code>client_max_body_size 10M;</code></li>
            <li>Drücke <kbd>Strg</kbd> + <kbd>x</kbd> zum verlassen. Nano wird dich fragen ob du speichern möchtest, gib <kbd>y</kbd> für ja ein und drücke zur Bestätigung <kbd>enter</kbd>.</li>
        </ul>
    </dd>
</dl>

