---
lang: de
layout: installation
meta_title: Ghost auf deinem Server installieren - Ghost-Dokumentation
meta_description: Alles was du wissen musst um deinen Ghost Blog lokal oder auf deinem Server starten zu können.
heading: Ghost installieren &amp; Erste Schritte
subheading: Was getan werden muss, um deinen neuen Blog zum ersten mal einzurichten.
chapter: installation
next_section: mac
---

## Überblick <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Die Ghost-Dokumentation ist noch in Arbeit und wird ständig aktualisiert und verbessert. Falls du nicht mehr weiter weißt oder Vorschläge für Verbesserungen hast, lass es uns wissen.

Ghost basiert auf [Node.js](http://nodejs.org) und benötigt die Version `0.10.*` (letzte stabile Version).

Ghost kann problemlos auf deinem Computer betrieben werden, du musst allerdings vorher Node.js installieren.



### Was ist Node.js?

[Node.js](http://nodejs.org) ist eine moderne Plattform zur Erstellung schneller, skalierbarer und effizienter Web-Anwendungen. Über die letzten 20 Jahre hat sich das Web von einer Sammlung statischer Seiten zu einer Plattform entwickelt, die dank der Programmiersprache JavaScript die Entwicklung komplexer Web-Anwendung wie Gmail und Facebook möglich machte.

Mittels [Node.js](http://nodejs.org) lässt sich JavaScript auch Serverseitig verwenden. Da es JavaScript bisher nur im Browser gab, musste Serverseitig eine andere Programmiersprache verwendet werden, beispielsweise PHP. Eine einzige Sprache für eine Webanwendung zu verwenden, bringt große Vorteile, und macht es einfacher für Entwickler, die sich traditionell nur auf der Client-Seite bewegt haben.

Ermöglicht wird dies durch die JavaScript-Engine aus Googles Chrome-Browser, die [Node.js](http://nodejs.org) überall verfügbar macht. Folglich lässt sich Ghost sehr schnell und einfach auf deinem Computer installieren und ausprobieren. Die folgenden Abschnitte beschreiben im Detail wie man Ghost auf [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) oder [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) installiert. Alternativ lässt sich Ghost auch auf einem [Server oder Webspace]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) nutzen.



### Erste Schritte

Falls du dir die manuelle Installation von Node.js und Ghost ersparen willst, haben die großartigen Leute von [BitNami](http://bitnami.com/) auch [Ghost-Installationsprogramme](http://bitnami.com/stack/ghost) für alle großen Platformen erstellt.

Ghost installieren auf:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Für den Fall dass du dich bereits dazu entschieden hast, Ghost auf deinem Server oder Hosting-Dienst zu installieren, sind das großartige Neuigkeiten! Die folgende Dokumentation führt Schritt für Schritt durch die verschiedenen Möglichkeiten, Ghost zu nutzen - von manueller Installation zu automatischen Installationsprogrammen.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghost einsetzen</a>
</div>

Bedenke dass Ghost noch in einem frühen Stadium ist und das Team mit einer wahnsinnigen Geschwindigkeit daran arbeitet, neue Features zu liefern. Falls du Ghost auf die neueste Version aktualisieren willst, folge unserer [Aktualisierungs-Dokumentation](/installation/upgrading/). Falls du nicht mehr weiter weißt, siehe dir unsere [Troubleshooting-Anleitung]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/) an, ansonsten findest du weitere Hilfe im [Ghost-Forum](http://ghost.org/forum), wo das Ghost-Team und die Community bereit sind dir bei Problemen zu helfen.
