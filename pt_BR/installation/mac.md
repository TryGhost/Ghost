---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt_BR/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---

# Instalando no Mac <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Para instalar o Node.js e o Ghost no seu mac, você terá que abrir uma janela do Terminal. Você pode abrir essa janela digitando "Terminal" na busca do Spotlight.

### Instalando o Node.js

*   Abra [http://nodejs.org](http://nodejs.org) clique "install", irá iniciar o download de um arquivo '.pkg'
*   Abra o instalador. Ele irá instalar o Node.js e o npm
*   Avance na instalação, finalizando com sua senha e clicando em "Instalar Aplicativo".
*   Uma vez que a instalação foi concluida, abra uma janela do Terminal e escreva `echo $PATH` para verificar que '/usr/local/bin/' está escrito.

<p class="note"><strong>Nota:</strong> Se '/usr/local/bin' não aparecer no seu $PATH, veja o <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">guia de resolução de problemas</a> para descobrir como adicionar</p>

Se você ficar perdido, você pode assistir [o processo aqui](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Instalando e Rodando o Ghost

*   Na [página de Downloads](https://ghost.org/download/), clique para fazer o download do arquivo zip mais recente.
*   Clique na seta proxima ao arquivo que foi feito download e clique em 'exibir no finder'.
*   No finder, clique duas vezes no arquivo zip para extrai-lo.
*   Depois, pegue a pasta extraída 'ghost-#.#.#' e arraste para a barra de abas do seu terminal. Isso fará com que seja criada uma nova aba na pasta do Ghost.
*   Na nova janela do terminal, escreva `npm install --production` <span class="note">não esqueça os dois traços</span>
*   Quando o npm terminal a instalação, escreva `npm start` para iniciar o Ghost em modo de desenvolvimento
*   No seu navegador, navegue para <code class="path">127.0.0.1:2368</code> para acessar o seu Ghost Blog
*   Altere a url para <code class="path">127.0.0.1:2368/ghost</code> e crie seu usuário administrador para se autenticar com seu Ghost.
*   Veja o [manual de uso](/usage) para maiores instruções sobre os próximos passos

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)