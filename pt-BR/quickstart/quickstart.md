---
lang: pt-BR
layout: quickstart
meta_title: Guia de Início Rápido para o Ghost
heading: Início Rápido para o Ghost
subheading: Configure e rode o Ghost.
chapter: quickstart
section: quickstart
---

# Geral <a id="overview"></a>

O Guia de Início Rápido para instalar e rodar o Ghost é para aqueles que já estão familiarizados com o [Node](http://nodejs.org), ou algo semelhante com o Ruby on Rails. Se você é novo nessa área, nós recomendamos que você dê uma olhada no mais detalhado [Guia de Instalação](/installation.html).

## Colocar o Ghost para rodar localmente <a id="ghost-local"></a>

Ghost requer o node `0.10.*` (a última versão estável).

Se você ainda não tem, entre no site <http://nodejs.org> e baixe a última versão do Node.js. O instalador irá preparar tanto o Node, quanto seu excelente gerenciador de pacotes, o npm.

Para usuário do Linux, ao invés de instalar o arquivo .tar.gz, você pode preferir [instalar utilizando o gerenciador de pacotes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

Baixe a última versão do Ghost no [Ghost.org/download/](https://ghost.org/download/). Extraia o arquivo para a pasta que vcoê quer rodar o Ghost - qualquer lugar serve!

Abra seu terminal (mac/linux) ou o promt de comando (windows) e navegue até o diretório raiz que você extraiu o arquivo do Ghost (aonde vive o arquivo package.json).

Para instalar o Ghost, rode `npm install --production`

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->