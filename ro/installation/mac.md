---
lang: ro
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ro/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Instalarea pe Mac <a id="install-mac"></a>

Pentru a instala Node.js și Ghost pe Mac vei avea nevoie de un Terminal. Poți deschide o fereastră scriind "Terminal" în Spotlight.

### Instalează Node

*   Pe [http://nodejs.org](http://nodejs.org) apasă Install. Un fișier '.pkg' va fi descărcat
*   Click pe fișier pentru a deschide installerul care va instala node și npm.
*   Urmează instrucțiunile date de installer.
*   După ce installerul s-a terminat deschide o linie de comanda și execută `echo $PATH` pentru a verifica dacă '/usr/local/bin' este în calea executabilelor.

<p class="note"><strong>Note:</strong> Dacă '/usr/local/bin' nu apare în $PATH, vezi <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">idei de reparare</a> pentru a afla cum să îl adaugi.</p>

Dacă rămâi blocat, poți urmării întregul proces [aici](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Instalează și rulează Ghost

*   Loghează-te pe [http://ghost.org](http://ghost.org) și dă click pe 'Download Ghost Source Code'.
*   Pe pagina de descărcare, alege ultima variantă disponibilă
*   Dă click pe fișierul descărcat pentru extragere
*   Folosind linia de comandă, navighează unde ai extras fișierul
*   Execută `npm install --production`
*   Când npm s-a finalizat, execută `npm start` pentru a porni Ghost în modul de dezvoltare
*   În browser, navighează la <code class="path">127.0.0.1:2368</code> pentru a verifica dacă totul e în regulă.
*   Pentru a crea un utilizator nou, intră la <code class="path">127.0.0.1:2368/ghost</code>
*   Vezi [ghid de utilizare](/usage) pentru pașii următori

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

