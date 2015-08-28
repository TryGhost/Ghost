---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt_BR/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Instalando no Windows <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Instalando o Node.js

*   Em [http://nodejs.org](http://nodejs.org) clique "install", irá iniciar o download de um arquivo '.msi'
*   Abra o instalador. Ele irá instalar o Node.js e o npm.
*   Avance na instalação, até ser informado que o Node.js já está instalado.

Se você ficar perdido, você pode assistir todo o [processo aqui](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### Download & Extraia Ghost

*   Na [página de arquivos](https://ghost.org/download/), pressione o botão para baiar o último arquivo .zip.
*   Clique na seta próxima ao arquivo mais recente e escolha 'Mostrar na Pasta'.
*   Quando essa pasta abrir, clique com o botão direito no arquivo .zip baixado e escolha 'Extrair tudo.'.

Se você ficar perdido, você pode assistir todo o [processo aqui](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### Instalando e Rodando o Ghost

*   No menu iniciar, ache 'Node.js' e abra o 'Node.js Command Prompt'
*   Na linha de comando do Node, você precisará navegar para o diretório que você extraiu o Ghost. Escreva: `cd Downloads/ghost-#.#.#` (Substitua as '#' com a versão que você fez download).
*   Na nova janela do terminal, escreva `npm install --production` <span class="note">Não esqueça os dois traços</span>
*   Quando o npm terminal a instalação, escreva `npm start` para iniciar o Ghost em modo de desenvolvimento
*   No seu navegador, navegue para <code class="path">127.0.0.1:2368</code> para acessar o seu Ghost Blog
*   Altere a url para <code class="path">127.0.0.1:2368/ghost</code> e crie seu usuário administrador para se autenticar com seu Ghost.
*   Veja o [manual de uso](/usage) para maiores instruções sobre os próximos passos

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")
