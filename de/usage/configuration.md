---
lang: de
layout: usage
meta_title: Wie man Ghost benutzt - Ghost-Dokumentation
meta_description: Eine ausführliche Anleitung zum Benutzen der Ghost Blogging-Platform. Du hast Ghost, weißt aber nicht wie du loslegst? Beginne hier!
heading: Ghost benutzen
subheading: Dich zurechtfinden und alles so einstellen, wie du es willst
chapter: usage
section: configuration
permalink: /de/usage/configuration/
prev_section: usage
next_section: settings
---

## Ghost Konfigurieren <a id="configuration"></a>

Nachdem du Ghost zum ersten Mal ausgeführt hast, findest du eine Datei mit dem Namen `config.js` in deinem root-Verzeichnis von Ghost, zusammen mit der `index.js`. Diese Datei erlaubt dir stufenweise die Konfiguration für Dinge wie deine URL, Datenbank und E-Maileinstellungen.

Wenn du Ghost noch nicht ausgeführt hast, wirst du diese Datei noch nicht haben. Du kannst sie erstellen, indem du die `config.example.js`-Datei kopierst - das tut Ghost auch, wenn es startet. 

Um deine Ghost-URL, E-Mail- oder Datenbankeinstellungen zu konfigurieren, öffne die `config.js` in deinem Lieblingseditor und beginne mit dem Bearbeiten der Einstellungen für dein gewünschtes Environment. Wenn Environments noch nichts ist, worüber du schon gestolpert bist, lies dir die [Dokumentation](#environments) unten durch.

## Konfigurationsoptionen

Ghost hat eine eine Vielzahl an Konfigurationsoptionen, die du hinzufügen kannst, um zu ändern, wie Ghost arbeitet.

### E-Mail

Wahrscheinlich das wichtigste Stück der Konfiguration sind die E-Maileinstellungen, damit Ghost dich dein Passwort zurücksetzten lassen kann, wenn du es vergisst. Lies die [E-Mail Dokumentation]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) für mehr Informationen.

### Datenbank

Standardmäßig kommt Ghost so konfiguriert, dass es eine SQLite-Datenbank benutzt, welche von deiner Seite aus keine Einstellungen benötigt.

Wenn du jedoch lieber eine MySQL-Datenbank benutzen möchtest, kannst du das tun, indem du die Datenbankkonfiguration änderst. Du musst zuerst eine Datenbank und Nutzer erstellen, dann kannst du die existierende sqlite3-Konfiguration zu etwas so etwas ändern:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'Dein_Datenbank_Nutzer',
    password : 'Dein_Datenbank_Passwort',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

Du kannst auch die Anzahl der gleichzeitigen Verbindungen über die `pool`-Einstellung limitieren, solltest du das wollen.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### Server

Der Serverhost und Serverport sind die IP-Adresse und Portnummer, die Ghost für Anfragen abhört.

Es ist auch möglich, Ghost so zu konfigurieren, dass es stattdessen ein UNIX Socket abhört, indem man die Serverkonfiguration zu etwas wie dem hier ändert:

```
server: {
    socket: 'Pfad/zum/Socket.sock'
}
```

### Update-Check

Ghost 0.4 führte einen automatischen Update-Check-Service ein, der dich wissen lässt, wenn eine neue Version von Ghost verfügbar ist (woo!). Ghost.org sammelt grundlegende anonyme Benutzerstatistiken von Update-Check-Anfragen. Schau dir für mehr Informationen die [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js)-Datei im Ghost-Core an.

Es ist möglich, die Update-Checks und anonyme Datensammlung durch folgende Option zu deaktivieren:

`updateCheck: false`

Bitte stelle sicher, dass du E-Mails von Ghost oder den [Ghost Blog](http://blog.ghost.org) abonnierst, sodass du trotzdem über neue Versionen informiert bleibst.

### Datenspeicherung

Einige Plattformen, zum Beispiel Heroku, haben ein permanentes Dateisystem. Dadurch gehen hochgeladene Bilder sehr wahrscheinlich irgendwann verloren.
Es ist möglich, Ghosts Datenspeicherungsfeatures auszustellen:

`fileStorage: false`

Wenn Datenspeicherung ausgeschaltet ist, wird dich Ghosts Image-Upload-Tool dazu auffordern, standardmäßig eine URL anzugeben, was zur Folge hat, dass Dateien nicht verloren gehen.


## Über Environments <a id="environments"></a>

Node.js und damit Ghost, haben Konzepte für Environments eingebaut. Environments erlauben es dir, verschiedene Konfigurationen für verschiedene Modi zu erstellen in welchen du Ghost laufen lassen willst. Standardmäßig hat Ghost zwei mitgelieferte Modi: **development** und **production**.

Es gibt ein paar, sehr subtile Unterschiede zwischen den beiden Modi oder Environments. Im wesentlichen ist **development** für das Entwickeln und Debuggen von Ghost ausgerichtet. Währenddessen ist **production** dafür gedacht, wenn du Ghost öffentlich laufen lässt. Die Unterschiede beinhalten Dinge wie beispielsweise welche Logging- und Errornachrichten ausgegeben werden und auch wie viele statische Anhänge verkettet oder minimiert werden. In **production** wirst du nur eine JavaScript-Datei bekommen, die allen Code für den Admin enthält, während du in **development** mehrere erhältst.

Während sich Ghost weiterentwickelt, werden diese Unterschiede zunehmen und ersichtlicher sein und damit auch immer wichtiger, dass jeder öffentliche Blog im **production**-Environment läuft. Das wirft vielleicht die Frage auf, warum der **development**-Modus der Standard ist, wenn doch die meisten Leute es im **production**-Modus laufen lassen wollen werden? Ghost hat **development** als Standard, weil sich dieses Environment am besten zum Debuggen von Problemen eignet, was du höchst wahrscheinlich brauchen wirst, wenn du Ghost zum ersten Mal ausführst.

##  Environments benutzen <a id="using-env"></a>

Um Ghost in verschiedenen Environments laufen zu lassen, musst du eine Environmentvariable verwenden. Wenn du zum Beispiel Ghost normal mit `node index.js` startest, würdest du dies benutzen:

`NODE_ENV=production node index.js`

Oder, wenn du normalerweise Forever benutzt:

`NODE_ENV=production forever start index.js`

Oder, wenn du du daran gewöhnt bist `npm start` zu benutzen, könntest du das etwas einfacher zu merkende benutzen:

`npm start --production`

### Warum `npm install --production` benutzen?

Wir wurden öfter gefragt, warum, wenn Ghost standardmäßig im development-Modus startet, die Installationsdokumentation sagt, `npm install --production` auszuführen? Das ist eine gute Frage! Wenn du `--production` beim Installieren von Ghost weglässt, wird nichts schlimmes passieren, aber es werden Tonnen extra Pakete installiert, die nur nützlich für Leute sind, die etwas für den Ghost-Core entwickeln wollen. Dazu benötigt man ebenfalls ein spezielles Paket, `grunt-cli`, global installiert, welches nichts mit `npm install -g grunt-cli` zu tun hat, es ist ein extra Schritt, der nicht benötigt wird, wenn du Ghost nur als Blog benutzen möchtest.

