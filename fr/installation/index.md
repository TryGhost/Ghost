---
lang: fr
layout: installation
meta_title: Comment installer Ghost sur votre serveur - Doc Ghost
meta_description: Tout ce que vous devez savoir pour faire fonctionner votre plateforme de blog Ghost sur votre environnement local ou distant.
heading: Installation de Ghost &amp; Démarrage
subheading: Premières étapes pour paramétrer votre nouveau blog pour la première fois.
chapter: installation
next_section: mac
---

## Vue d'ensemble <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

La documentation de Ghost est un travail en cours, il est mis à jour et amélioré régulièrement. Si vous êtes bloqués ou si vous avez des idées pour améliorer cette documentation, faites le nous savoir.

Ghost est construit sur [Node.js](http://nodejs.org), et requiert la verion `0.10.*` (dernière version stable).

Faire tourner Ghost localement sur votre ordinateur est très simple, mais requiert que vous installiez Node.js.

### Qu'est-ce que Node.js?

[Node.js](http://nodejs.org) est une plateforme moderne pour créer des applications web rapides, évolutives et efficaces.
    Ces 20 dernières années, le web a évolué, en partant d'une collection d'images statiques pour aller vers une plateforme capable de supporter des applications web complexes comme Gmail et Facebook. Javascript est le langage de programmation qui a permis ce progrès.

[Node.js](http://nodejs.org) nous offre la possibilité d'écrire du code JavaScript côté serveur. Dans le passé, JavaScript existait seulement dans le navigateur web, et un second langage de programmations, tel que PHP, était requis pour programmer du côté serveur. Disposer d'une application web qui consiste en un seul et unique langage de programmation est très bénéfique, et cela rend également Node.js accessible aux développeurs qui pourraient être restés sur la programmation côté client.

La manière avec laquelle [Node.js](http://nodejs.org) rend cela possible, est d'englober le moteur JavaScript du navigateur Google Chrome et de le rendre installable partout. Cela signifie que vous pouvez installer Ghost sur votre ordinateur et l'essayer très rapidement et facilement.
    Les sections suivantes détaillent comment installer Ghost localement sur [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) ou [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) ou vous aideront à déployer Ghost sur un [serveur ou un hébergement]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Démarrage

Si vous ne vous sentez pas à suivre les instructions sur comment installer Node.js et Ghost manuellement, de chouettes personnes de chez [BitNami](http://bitnami.com/) ont créé [des installateurs Ghost](http://bitnami.com/stack/ghost) pour les plateformes majeures.

Je veux installer Ghost sur :

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Si vous vous êtes déjà décidé à deployer Ghost sur vos serveurs ou votre hébergement, c'est une super nouvelle ! La documentation suivante vous guidera à travers les différentes options disponiblesp our installer Ghost, via paramétrage manuel ou installateurs en un clic.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Déployer Ghost</a>
</div>

Souvenez-vous que Ghost est tout nouveau, et l'équipe travaille dur pour offrir des fonctionnalités à un rythme effréné. Si vous avez besoin de mettre à jour Ghost à sa deernière version, visitez [la page mise à jour](/installation/upgrading/).
    Si vous êtes bloqué , visitez le [guide de dépannage]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), ou si cela n'aide pas, merci de rentrer en contact via le [forum Ghost](http://ghost.org/forum) où l'équipe et la communauté sont prêts à vous aider en cas de problème.

