---
lang: ro
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ro/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Upgradează Ghost <a id="upgrade"></a>

Upgradarea Ghost se face printr-o procedură simplă.

Există câteva metode prin care poți face asta. Următoarele descriu ce trebuie să se întâmple, apoi descrie procesul pas cu pas pentru a executa upgrade-ul [point-and-click](#how-to) și prin [linia de comandă](#cli), astfel încât poți alege metoda cu care ești confortabil.

<p class="note"><strong>Fă o copie de rezervă!</strong> Salveză o copie de rezervă de fiecare dată când vrei să modifici platforma. Citește <a href="#backing-up">instrucțiuni de backup</a> prima dată!</p>

## Descriere

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost, odată instalat, are o structură a folderelor similară cu cea din stânga. Cele două directoare principale <code class="path">content</code> și <code class="path">core</code>, plus câteva fișiere la rădăcină.

Upgradarea Ghost înseamnă înlocuirea fișierelor vechi cu cele noi, rularea `npm install` pentru a actualiza folderul <code class="path">node_modules</code> și apoi repornirea Ghost pentru a rula versiunea nouă.

De la sine, Ghost salvează datele, temele, imaginile, etc. în directorul <code class="path">content</code> așa că ai grijă să nu îl suprascrii! Înlocuiește doar fișierele <code class="path">core</code> și rădăcina și totul va rămâne intact.

## Copie de rezervă <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   Pentru a salva datele din baza de date, loghează-te pe Ghost și navighează în <code class="path">/ghost/debug/</code>. Apasă Export și descarcă fișierul JSON care conține toate informațiile personale.
*   Pentru a face o copie a temelor și imaginilor, trebuie să copiezi fișierele din <code class="path">content/themes</code> și <code class="path">content/images</code>

<p class="note"><strong>Notă:</strong> Dacă vrei poți să copiezi baza de date din <code class="path">content/data</code>, dar <strong>ai grijă</strong> să nu faci asta în timp ce Ghost rulează. Oprește nodul prima dată.</p>


## Cum să upgradezi <a id="how-to"></a>

Cum să upgradezi pe mașina personală

<p class="warn"><strong>ATENȚIE:</strong> <strong>NU</strong> suprascrie întregul director Ghost peste unul deja existent. <strong>NU</strong> alege <kbd>REPLACE</kbd> dacă uploadezi folderul prin Transmit sau alt soft FTP, alege <strong>MERGE</strong>.</p>

*   Descarcă ultima versiune de Ghost de la [Ghost.org](http://ghost.org/download/)
*   Extrage zipul într-un loc temporar
*   Copiază folderele de la rădăcină din versiunea nouă. Include index.js, package.json, Gruntfile.js, config.example.js, licența și fișierele readme.
*   Înlocuiește directorul `core`
*   Pentru actualizări care conțin update-uri la Casper (tema de bază), înlocuiește <code class="path">content/themes/casper</code> cu cel nou.
*   Execută `npm install --production`
*   Repornește Ghost

## Doar din linia de comandă <a id="cli"></a>

<p class="note"><strong>Fă o copie de rezervă!</strong> Salveză o copie de rezervă de fiecare dată când vrei să modifici platforma. Citește <a href="#backing-up">instrucțiuni de backup</a> prima dată!</p>

### Din linia de comandă pe Mac <a id="cli-mac"></a>

Screencastul de mai jos vă arată pașii pentru actualizarea Ghost unde fișierul zip a fost descarcat în <code class="path">~/Downloads</code> și Ghost este instalat în <code class="path">~/ghost</code><span class="note">**Notă:** `~` înseamnă directorul principal al utilizatorului de Mac sau Linux</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

Aceștia sunt pașii din screencast:

*   <code class="path">cd ~/Downloads</code> - schimbă directorul unde nou Ghost a fost descărcat
*   `unzip ghost-0.3.1.zip -d ghost-0.3.3` - descarcă ghost în directorul <code class="path">ghost-0.3.3</code>
*   <code class="path">cd ghost-0.3.3</code> - schimbă directorul la <code class="path">ghost-0.3.3</code> directory
*   `ls` - arată toate fișierele din director
*   `cp *.md *.js *.txt *.json ~/ghost` - copiază toate fișierele .md .js .txt and .json de aici în <code class="path">~/ghost</code>
*   `cp -R core ~/ghost` - copiază directorul <code class="path">core</code> și tot ce conține în <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - copiază directorul <code class="path">casper</code> și tot ce conține la <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - schimbă directorul la <code class="path">~/ghost</code>
*   `npm install --production` - instalează Ghost
*   `npm start` - pornește Ghost

### Din linia de comandă pe Linux <a id="cli-server"></a>

*   Prima dată vă trebuie URLul ultimei versiuni de Ghost. O să fie similar cu: `http://ghost.org/zip/ghost-latest.zip`.
*   Descarcă fișierul prin următoarea comandă: `wget http://ghost.org/zip/ghost-latest.zip`
*   Dezarhivează arhiva cu `unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install`
*   Rulează `npm install --production` pentru a instala dependințele noi
*   Repornește Ghost

**Adițional**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) are instrucțiuni pentru instalarea Ghost pe serverele Linux.

### Cum să actualizezi DigitalOcean Droplet <a id="digitalocean"></a>

<p class="note"><strong>Fă o copie de rezervă!</strong> Salveză o copie de rezervă de fiecare dată când vrei să modifici platforma. Citește <a href="#backing-up">instrucțiuni de backup</a> prima dată!</p>

*   Prima dată vă trebuie URLul ultimei versiuni de Ghost. O să fie similar cu: `http://ghost.org/zip/ghost-latest.zip`.
*   O dată ce aveți fișierul, executați `cd /var/www/` pentru a schimba directorul în instalarea Ghost.
*   Execută `wget http://ghost.org/zip/ghost-latest.zip`
*   Dezarhivează cu `unzip -uo ghost-0.3.*.zip -d ghost`
*   Asigură-te că ai permisiile necesare cu `chown -R ghost:ghost ghost/*`
*   Rulează `npm install` pentru dependințele noi
*   Repornește Ghost cu `service ghost restart`

## Cum să actualizezi Node.js la ultima versiune <a id="upgrading-node"></a>

Dacă inițial ai avut Node.js de la [Node.js](nodejs.org), poți actualiza la ultima versiune descărcând ultima versiune și rulând instalatorul.

If you are on Ubuntu, or another linux distribution which uses `apt-get`, the command to upgrade node is the same as to install: `sudo apt-get install nodejs`.
Dacă ești pe Ubuntu sau altă distribuție Linux care folosește `apt-get`, comanda pentru a actualiza este `sudo apt-get install nodejs`.

**Nu** e nevoie să restartezi Ghost sau serverul.
