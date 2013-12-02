---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din server - Ghost dokumentation
meta_description: Alt du har behov for, for at f&aring; Ghost blogging platformen op og k&oslash;re p&aring; din lokale maskine eller hosting service.
heading: Installation af Ghost &amp; kom godt i gang
subheading: De f&oslash;rste trin til at oprette din nye blog for f&oslash;rste gang.
permalink: /da/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installation p&aring; Mac <a id="install-mac"></a>

For at installere Node.js og Ghost p&aring; din Mac skal du &aring;bne et terminalvindue. Du kan g&oslash;re det ved at &aring;bne "spotlight" og skrive "Terminal".

### Installation af Node

*   P&aring; [http://nodejs.org](http://nodejs.org) skal du klikke p&aring; install, og en '.pkg' fil hentes
*   Klik p&aring; filen for at begynde installationen, dette installerer b&aring;de node og npm.
*   Klik dig igennem installationen, inden du til sidst skal du indtaste dit kodeord og klikke p&aring; 'install software'.
*   N&aring;r installationen er f&aelig;rdig, skal du &aring;bne dit terminalvindue og skrive `echo $PATH` for at kontollere at stien er '/usr/local/bin/'.

<p class="note"><strong>Note:</strong> Hvis '/usr/local/bin' ikke er en del af din $PATH, se <a href="#export-path">fejlfindingsguiden</a> for at finde ud af hvordan du tilf&oslash;jer det</p>

K&oslash;rer du fast kan du se hele [processen her](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Installation af Node p&aring; Mac").

### Install&eacute;r and k&oslash; Ghost

*   Log ind p&aring; [http://ghost.org](http://ghost.org), og klik p&aring; den bl&aring; 'Download Ghost Source Code' knap.
*   P&aring; download siden skal du klikke p&aring; knappen for at hente den nyeste zip fil.
*   Klik p&aring; pilen ved siden af den netop hentede fil og v&aelig;lg 'Vis i finder'.
*   I finder skal du dobbeltklikke p&aring; den downloadede zip fil for at pakke den ud.
*   Derefter skal du tr&aelig;kke den netop udpakkede 'ghost-#.#.#' mappe til tab baren p&aring; dit &aring;bne terminalvindue, det &aring;bner en ny terminal tab, som er &aring;bnet i den korrekte placering.
*   I den nye terminal tab skriver du `npm install --production` <span class="note">bem&aelig;rk de to bindestreger</span>.
*   N&aring;r npm er f&aelig;rdig med at installere, skriver du `npm start` for at starte Ghost i udviklingstilstand.
*   I en browser g&aring;r du ind p&aring; <code class="path">127.0.0.1:2368</code> for at se din nye Ghost blog.
*   &AElig;ndr URL'en til <code class="path">127.0.0.1:2368/ghost</code> og opret din admin bruger til at logge ind i Ghost administrationen.
*   Se [brug](/usage) for instruktioner til de n&aelig;ste trin.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

