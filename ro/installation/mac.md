---
lang: ro
layout: installation
meta_title: Cum să instalezi Ghost pe serverul tău - Documentație Ghost
meta_description: Tot ce trebuie să știi ca să poți rula Ghost din mediul tău local sau remote.
heading: Instalare Ghost &amp; Noțiuni de bază
subheading: Primii pași pentru setarea noului tău blog pentru prima dată.
permalink: /ro/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Instalare pe Mac <a id="install-mac"></a>

Pentru a instala Node.js și Ghost pe Mac trebuie să deschizi o fereastră terminal. Poți face asta deschizând spotlight și tastând "Terminal".

### Instalare Node

*   Pe [http://nodejs.org](http://nodejs.org) apasă install, un fișier '.pkg' va fi descărcat
*   Deschide fișierul pentru a porni instalarea. Se va instala atât node cât și npm.
*   Parcurge instrucținile de instalare, introducând parola și în final apăsând pe 'install software'.
*   După ce instalarea s-a terminat, într-un Terminal tastează `echo $PATH` pentru a verifica dacă '/usr/local/bin/' se află în path.

<p class="note"><strong>Notă:</strong> Dacă '/usr/local/bin' nu se află în $PATH, vezi <a href="#export-path">troubleshooting tips</a> pentru a afla cum să-l adaugi.</p>

Dacă te împotmolești poți să [vezi tot procesul aici](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Instalare și rulare Ghost

*   Loghează-te pe [http://ghost.org](http://ghost.org), apoi apasă pe butonul albastru 'Download Ghost Source Code'.
*   Pe pagina de download, apasă butonul pentru a descărca cel mai recend fișier zip.
*   Apasă pe săgeata de lângă fisierul descărcat și alege 'show in finder'.
*   În finder, dublu-click pe fișierul zip descărcat pentru a-l extrage.
*   Trage folderul extras peste tab-ul din fereastra Terminal, acest lucru va deschide un Terminal nou din locatia folderului.
*   În noul Terminal scrie `npm install --production` <span class="note">păstrând cele doua liniuțe</span>.
*   Când npm a terminat de instalat, scrie `npm start` pentru a porni Ghost în mod development.
*   Într-o fereastră de browser, navighează către <code class="path">127.0.0.1:2368</code>.
*   Schimbă URL-ul în <code class="path">127.0.0.1:2368/ghost</code> și creează userul admin pentru administrare.
*   Vezi [usage docs](/usage) pentru instrucțiunile următorilor pași.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

