---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din server - Ghost dokumentation
meta_description: Alt du har behov for, for at f&aring; Ghost blogging platformen op og k&oslash;re p&aring; din lokale maskine eller hosting service.
heading: Installation af Ghost &amp; kom godt i gang
subheading: De f&oslash;rste trin til at oprette din nye blog for f&oslash;rste gang.
permalink: /da/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Installation p&aring; Linux <a id="install-linux"></a>

### Installation af Node

*   Download enten `.tar.gz` arkivet fra [http://nodejs.org](http://nodejs.org), eller hvis du foretr&aelig;kker at f&oslash;lge instruktionerne til hvordan du [installerer fra en package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) istedet.
*   Dobbelttjek at du har Node og npm installeret ved at skrive `node -v` og `npm -v` i et terminalvindue

### Install&eacute;r and k&oslash; Ghost

*   Log ind p&aring; [http://ghost.org](http://ghost.org), og klik p&aring; den bl&aring; 'Download Ghost Source Code' knap
*   P&aring; download siden skal du tryk p&aring; knappen for at hente den nyeste zip fil og pak derefter filen ud der hvor du vil køre Ghost fra
*   I et terminalvindue skal du skift mappe til roden af den udpakkede Ghost mappe
*   I et terminalvindue skriver du `npm install --production` <span class="note">vær opmærksom p&aring; de to bindestreger</span>
*   N&aring;r npm er f&aelig;rdig med at installere skriver du `npm start` for at starte Ghost i udviklingstilstand
*   I en browser g&aring;r du inde p&aring; <code class="path">127.0.0.1:2368</code> for at se din nyinstallerede Ghost blog
*   Skift url til <code class="path">127.0.0.1:2368/ghost</code> og opret din admin bruger for at logge ind i Ghost administrationen

Benytter du linux som et g&aelig;ste OS eller gennem SSH og kun har terminalen skal du istedet g&oslash;re f&oslash;lgende:

*   Benyt dit normale operativsystem til at finde URL'en til Ghost zip filen (den &aelig;ndrer sig for hver version), gem URL'en men &aelig;ndr '/zip/' til '/archives/'
*   I terminalen benyt `wget url-of-ghost.zip` for at hente Ghost
*   Pak filerne ud med `unzip -uo Ghost-#.#.#.zip -d ghost`, og derefter `cd ghost`
*   Skriv `npm install --production` for at installere Ghost <span class="note">bem&aelig;rk de to bindestreger</span>
*   N&aring;r npm er f&aelig;rdig med at installere skriver du `npm start` for at starte Ghost i udviklingstilstand
*   Ghost k&osalsh;rer nu p&aring; localhost

