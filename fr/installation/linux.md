---
lang: fr
layout: installation
meta_title: Comment installer Ghost sur votre serveur - Doc Ghost
meta_description: Tout ce que vous devez savoir pour faire fonctionner votre plateforme de blog Ghost sur votre environnement local ou distant.
heading: Installation de Ghost &amp; Démarrage
subheading: Premières étapes pour paramétrer votre nouveau blog pour la première fois.
permalink: /fr/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Installation sur Linux <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Installer Node

*   Téléchargez soit l'archive `.tar.gz` depuis [http://nodejs.org](http://nodejs.org), ou suivez les instructions sur comment [installer depuis un gestionnaire de paquet](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Vérifieez que Node.js et NPM sont installés en tapant `node -v` et `npm -v` dans une fenêtre de terminal

### Installer et lancer Ghost

*   Sur [la page de téléchargements](https://ghost.org/download/), cliquez sur le bouton pour télécharger le dernier fichier zip et décompresez le à l'endroit où vous souhaitez que Ghost tourne
*   Dans une fenêtre de terminal, changez le répertoire vers la racine du dossier Ghost juste extrait
*   Dans le terminal, tapez `npm install --production` <span class="note">notez les deux tirets</span>
*   Quand NPM a fini d'installer, tapez `npm start` pour démarrer Ghost en mode développement
*   Dans un navigateur, naviguez vers <code class="path">127.0.0.1:2368</code> pour consulter votre nouveau blog Ghost
*   Changez l'URL vers <code class="path">127.0.0.1:2368/ghost</code> et créez votre utilisateur admin pour vous connecteur sur l'administration de Ghost

Si vous utilisez Linux en tant que système distant ou à travers SSH et que vous ne disposez que d'un terminal, alors :

*   Utilisez votre système d'exploitation normal pour trouver l'URL du fichier zip de Ghost (il change à chaque verion), sauvegardez l'URL mais changez '/zip/' pour '/archives/'
*   Dans le terminal, utilisez `wget url-of-ghost.zip` pour télécharger Ghost
*   Dézippez l'archive avec `unzip -uo Ghost-#.#.#.zip -d ghost`, puis tapez `cd ghost`
*   Dans le terminal, tapez `npm install --production` <span class="note">notez les deux tirets</span>
*   Quand NPM a fini d'installer, tapez `npm start` pour démarrer Ghost en mode développement
*   Ghost tournera maintenant sur localhost


