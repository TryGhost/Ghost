---
lang: fr
layout: installation
meta_title: Comment installer Ghost sur Mac - Doc Ghost
meta_description: Tout ce que vous devez savoir pour faire fonctionner votre plateforme de blog Ghost sur votre environnement local ou distant.
heading: Installing Ghost &amp;
subheading: Installez Ghost sur Mac
permalink: /fr/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Installing on Mac <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Pour installer Node.js et Ghost sur votre Mac, vous devez tout d'abord ouvrir un terminal. Vous pouvez en obtenir un en ouvrant la recherche rapide en tappant "Terminal".

### Install Node

*   Sur [http://nodejs.org](http://nodejs.org) cliquez sur install, un fichier '.pkg' va être téléchargé
*   Une fois téléchargé, cliquez dessus pour ouvrir l'installeur, cela va installer node et npm
*   Entrez votre mot de passe et cliquez sur 'installer le logiciel'
*   Une fois l'installation terminée, allez sur le terminal et tappez `echo $PATH` pour verifier que '/usr/local/bin/' est référencé dans le path

<p class="note"><strong>Note:</strong> Si '/usr/local/bin' n'apparaît pas dans la variable d'environnement $PATH, visitez <a href="#export-path">la page de résolution des problèmes</a> pour trouver une façon de corriger ça</p>

Si vous êtes bloqués, vous pouvez regarder la vidéo en entier [process in action ici](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Install and Run Ghost

*   Sur la [page de téléchargement](https://ghost.org/download/), cliquez sur le boutton de téléchargement pour récupérer la dernière version de Ghost sous format zip.
*   Cliquez sur la flèche à côté du fichier téléchargé et choisissez 'afficher dans le finder'
*   Dans le finder, double-cliquez sur le fichier zip pour l'extraire
*   Ensuite, recupéréz le dossier qui viens d'être créer 'ghost-#.#.#' et glissez le dans la bar de votre terminal, cela va ouvrir un nouveau terminal localisé dans le bon dossier.
*   Dans le nouveau terminal, tappez `npm install --production` <span class="note">notez qu'il y a deux tirets</span>
*   Une fois que npm a terminé, tappez `npm start` pour démarrer Ghost en mode développement
*   Dans un navigateur, visitez <code class="path">127.0.0.1:2368</code> pour accéder à votre nouveau blog Ghost
*   Visitez <code class="path">127.0.0.1:2368/ghost</code> pour accéder à l'interface administrateur. Une fois sur cette page, vous êtes invités à créer un utilisateur admin et ainsi pouvoir vous identifier.
*   Accédez aux [documentations d'usage](/usage) pour les étapes suivantes.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)
