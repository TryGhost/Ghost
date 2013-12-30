---
lang: ro
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ro/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Instalarea pe Windows <a id="install-windows"></a>

### Instalează Node

*   Pe [http://nodejs.org](http://nodejs.org) apasă install și un fișier '.msi' va fi descărcat.
*   Click pe fișier pentru a deschide instalatorul. Node și npm va fi instalat.
*   Urmează instrucțiunile instalatorului

Dacă întâmpini probleme, vezi întregul process [aici](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### Descarcă și Extrage Ghost

*   Intră pe [http://ghost.org](http://ghost.org) și dă click pe 'Download Ghost Source Code'.
*   Extrage fișierul

Dacă întâmpini probleme, vezi întregul process [aici](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### Instalează și Ruelază Ghost

*   În meniul start găsește 'Node.js' și alege 'Node.js Command Prompt'.
*   În linia de comandă navighează unde ai extra Ghost. Execută `cd Downloads/ghost-#.#.#` (Înlocuiește #.#.# cu versiunea curentă a Ghost).
*   Execută `npm install --production`.
*   Când npm s-a instalat, scrie `npm start` pentru a porni Ghost.
*   În browser, navighează la <code class="path">127.0.0.1:2368</code> pentru a vedea noul blog.
*   Navighează la <code class="path">127.0.0.1:2368/ghost</code> pentru a creea un utilizator nou.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

