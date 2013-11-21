---
lang: da
layout: installation
meta_title: Sådan installerer du Ghost på din server - Ghost dokumentation
meta_description: Alt du har behov for, for at få Ghost blogging platform op og køre på din lokale maskine eller server eller hosting service.
heading: Installation af Ghost &amp; Kom i gang
subheading: De første trin til at få oprettet din nye blog for første gang.
permalink: /da/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installation på Mac <a id="install-mac"></a>

For at installere Node.js og Ghost på din mac skal du åbne et terminalvinduet. Du kan gøre det ved at åbne "spotlight" og skrive "Terminal".

### Installér Node

*   På [http://nodejs.org](http://nodejs.org) klik på install, en '.pkg' fil begynde at downloade
*   Klik på den downloadet pakke for at begynde installation, dette vil installere både node og npm.
*   Klik dig igennem installationen, til sidst skal du indtaste dit kodeord og klik 'install software'.
*   Når installationen er færdig, åben dit terminalvindueog skriv `echo $PATH` for at kontollere at '/usr/local/bin/' er din sti.

<p class="note"><strong>Note:</strong> Hvis '/usr/local/bin' ikke er en del af din $PATH, se <a href="#export-path">fejlfindings tips</a> for at hvordan og tilføj det</p>

If you get stuck you can watch the whole [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

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

