---
lang: fr
layout: usage
meta_title: Comment utiliser Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: Utilisation de Ghost
subheading: Trouver votre chemin, et configurer le comme vous le souhaitez
chapter: usage
section: configuration
permalink: /fr/usage/configuration/
prev_section: usage
next_section: settings
---


## Configuration de Ghost <a id="configuration"></a>

Après avoir lancé Ghost pour la première fois, vous trouverez un fichier appelé `config.js` dans le répertoire racine de Ghost, accompagné du fichier `index.js`. Ce fichier vous permet de définir la configuration de plusieurs élément comme votre URL, votre base de données, et les paramètres de messagerie.

Si vous n'avez pas encore lancé Ghost pour la première fois, vous n'aurez pas encore ce fichier. Vous pouvez en créer un en copiant le fichier `config.example.js` - c'est ce que fait Ghost au démarrage.

Pour configurer votre URL d'accès à Ghost, les paramètres de messagerie ou les paramètres de base de données, ouvrez `config.js` dans votre éditeur de texte favori, et commencer à changer les paramètres de votre environnement souhaité. Si les environnements ne sont pas quelque chose avec lequel vous avez eu affaire, lisez la documentation ci-dessous.

## À propos des environnements <a id="environments"></a>

Node.js, et donc Ghost, a concept d'environnements intégré. Les environnements permettent de créer différentes configurations pour différents modes dans lesquels vous pourriez vouloir exécuter Ghost. Par défaut Ghost a deux modes intégrés: **développement** et **production** .

Il ya quelques différences, subtiles entre les deux modes ou environnements. Essentiellement **développement**  est orientée vers le développement, et en particulier le débogage de Ghost. Par contre la "production" est destiné à être utilisé lorsque vous exécutez Ghost pour une utilisation publique. Les différences comprennent des choses comme ce que l'exploitation des logs et l'affichage des messages d'erreur, et aussi bien la concatenation et la minification des ressources  statiques. Dans le mode  **production**, vous aurez juste un fichier JavaScript contenant tout le code pour l'administrateur, dans le mode **développement** vous en aurez plusieurs.

Comme Ghost progresse, ces différences vont grandir et devenir plus apparentes, et il y aura donc de plus en plus de blog public fonctionnant dans un environnement de  **production**. Cela soulève peut-être la question, pourquoi definir le mode **développement** par défaut, si la plupart des gens vont vouloir l'exécuter dans le mode **production**? Ghost est par défaut en mode  **développement**  parce que c'est l'environnement qui est le mieux pour le débogage des problèmes, que vous êtes le plus susceptible d'avoir besoin pour le mettre place la première fois.

##  Utilisation des environnement <a id="using-env"></a>

Afin de configurer Ghost pour qu'il s'exécute dans différents environnements, vous devez utiliser une variable d'environnement. Par exemple, si vous commencez normalement Ghost avec `node index.js` vous pouvez utiliser:

`NODE_ENV=production node index.js`

Ou vous utilisez **forever**:

`NODE_ENV=production forever start index.js`

Ou si vous êtes habitué à utiliser `npm start` vous pouvez utiliser une commande un peu plus facile à retenir:

`npm start --production`

### Pourquoi utiliser `npm install --production`?

Nous avons demandé à quelques reprises pourquoi, si Ghost démarre en mode de développement par défaut, ne la documentation d'installation dire à exécuter `npm install --production`? C'est une bonne question! Si vous ne spécifiez pas `--production` a Ghost lors de l'installation, rien de mauvais va se passer, mais il va installer une tonne de packages supplémentaires qui ne sont utiles que pour les personnes qui veulent développer le noyau de Ghost. Cela exige aussi que vous ayez un package particulier, `grunt-cli` installé globalement, ce qui doit être fait avec `npm install -g grunt-cli`, c'est une étape supplémentaire et il n'est pas nécessaire si vous voulez juste pour exécuter Ghost comme un blog.

