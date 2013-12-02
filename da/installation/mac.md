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

### Install and Run Ghost

*   Log in to [http://ghost.org](http://ghost.org), and then click the blue 'Download Ghost Source Code' button.
*   On the downloads page, press the button to download the latest zip file.
*   Click on the arrow next to the newly downloaded file, and choose 'show in finder'.
*   In finder, double-click on the downloaded zip file to extract it.
*   Next, grab the newly extracted 'ghost-#.#.#' folder and drag it onto the tab bar of your open terminal window, this will make a new terminal tab which is open at the correct location.
*   In the new terminal tab type `npm install --production` <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   In a browser, navigate to <code class="path">127.0.0.1:2368</code> to see your newly setup Ghost blog
*   Change the url to <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin.
*   See the [usage docs](/usage) for instructions on the next steps

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

