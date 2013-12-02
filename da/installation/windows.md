---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din server - Ghost dokumentation
meta_description: Alt du har behov for, for at f&aring; Ghost blogging platformen op og k&oslash;re p&aring; din lokale maskine eller hosting service.
heading: Installation af Ghost &amp; kom godt i gang
subheading: De f&oslash;rste trin til at oprette din nye blog for f&oslash;rste gang.
permalink: /da/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---


# Installation i Windows <a id="install-windows"></a>

### Installation af Node

*   P&aring; [http://nodejs.org](http://nodejs.org) skal du klikke p&aring; install, og en '.msi' fil hentes
*   Klik p&aring; filen for at begynde installationen, dette installerer b&aring;de node og npm.
*   Klik dig igennem installationen indtil du f&aring; en besked der forst&aelig;ller dig at Node.js er installeret.

K&oslash;rer du fast kan du se hele [processen her](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Installation af Node i Windows").

### Download og pak Ghost ud

*   Log ind p&aring; [http://ghost.org](http://ghost.org), og klik p&aring; den bl&aring; 'Download Ghost Source Code' knap.
*   P&aring; download siden skal du klikke p&aring; knappen for at hente den nyeste zip fil.
*   Klik p&aring; pilen ved siden af den netop hentede fil og v&aelig;lg 'Vis i mappe'.
*   N&aring;r mappen &aring;bner, skal du h&oslash;jreklikke p&aring; den hentede fil og v&aelig;lg 'Udpak alle'.

K&oslash;rer du fast kan du se hele [processen her](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Installation af Ghost i Windows - Del 1").

### Install&eacute;r and k&oslash; Ghost

*   Find 'Node.js' i din startmenu og &aring;ben 'Node.js Command Prompt'
*   I Node command prompt skal du skifte til mappen, hvor Ghost blev pakket ud. Skriv: `cd Downloads/ghost-#.#.#` (udskift hashes med versionen af Ghost du hentede)
*   Derefter skal du i command prompt skrive `npm install --production` <span class="note">bem&aelig;rk de to bindestreger</span>
*   N&aring;r npm er f&aelig;rdig med at installere, skriver du `npm start` for at starte Ghost i udviklingstilstand.
*   I en browser g&aring;r du ind p&aring; <code class="path">127.0.0.1:2368</code> for at se din nye Ghost blog.
*   &AElig;ndr URL'en til <code class="path">127.0.0.1:2368/ghost</code> og opret din admin bruger til at logge ind i Ghost administrationen.
*   Se [brug](/usage) for instruktioner til de n&aelig;ste trin.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Installation af Ghost i Windows - Del 2")

