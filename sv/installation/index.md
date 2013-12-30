---
lang: sv
layout: installation
meta_title: Hur du installerar Ghost på din server - Ghost Docs
meta_description: Allt du behöver veta för att komma igång med bloggplattformen Ghost på din lokal eller fjärrmiljö.         
heading: Installation av Ghost &amp; Komma igång
subheading: De första stegen för att sätta upp din blogg för första gången.
permalink: /sv/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Översikt <a id="overview"></a>

Dokumentationen för Ghost ett pågående arbete, den uppdateras och förbättras regelbundet. Om du fastnar eller har förslag på förbättringar, kontakta oss.

Ghost är byggt på [Node.js](http://nodejs.org), och kräver version `0.10.*` (senaste stabila versionen).

Att få igång Ghost lokalt på din dator är okomplicerat, men det kräver att du installerar Node.js först.

### Vad är Node.js?

[Node.js](http://nodejs.org) är en modern plattform för att bygga snabba, skalbara  och effektiva webbapplikationer.
    Över de senaste 20 åren har webben utvecklats från att vara en kollektion av statiska sidor till en plattform kapabel att stödja komplexa webbapplikation som Gmail och Facebook.
    JavaScript är programmeringsspråket som har möjliggjort denna utveckling.

[Node.js](http://nodejs.org) ger oss möjligheten att skriva JavaScript på serversidan. Förut existerade JavaScript endast i webbläsaren, och ett sekundärt programmeringsspråk, såsom PHP, var nödvändigt för att göra programmeringen på serversidan. Att ha en webbapplikation som är skriven i ett enda programmeringsspråk är en stor fördel, och det gör även Node.js lättåtkomligt för utvecklare som traditionellt hållt sig på klientsidan.

Sättet som [Node.js](http://nodejs.org) gör detta möjligt, är genom att göra JavaScript-motorn från Googles webbläsare Chrome och gör den installerbar var som helst. Detta betyder att du kan få Ghost installerat på din dator för att testa det väldigt snabbt.
    Följande avsnitt ger detaljerade instruktioner för att installera Ghost lokalt på [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) eller [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) eller hjälper dig att komma igång med Ghost på en [server eller ett webbhotell]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Komma igång

Om du inte har lust att följa instruktioner för att installera Node.js och Ghost manuellt så har de fantastiska personerna hos [BitNami](http://bitnami.com/) skapat [Ghost installationsskript](http://bitnami.com/stack/ghost) för alla stora plattformar.

Jag vill installera Ghost på:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Om du redan bestämt dig för att installera Ghost på din server eller ditt webbhotell så är det goda nyheter! Följande dokumentation tar dig igenom de olika alternativ för att komma igång med Ghost, från manuella installationer till en-klicks-installationsskript.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Kom ihåg att Ghost är splitternytt, och laget jobbar hårt på att leverera funktioner i en våldsam hastighet. Om du behöver uppgradera Ghost till senaste versionen, följ vår [upgraderingsdokumentation](/installation/upgrading/).
    Om du fastnar, kolla in [felsökningsguiden]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), eller om inte det hjälper, skriv på [Ghost-forumet](http://ghost.org/forum) där Ghosts personal och gemenskap kan hjälpa dig med alla dina problem.

