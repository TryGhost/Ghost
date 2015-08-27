---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt_BR/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Instalando no Linux <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Instalar o Node

*   Você pode baixar o arquivo `.tar.gz` do site [http://nodejs.org](http://nodejs.org), ou seguir as instruções para [instalar pelo gerenciador de pacotes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) também.
*   Confira se você tem o Node e o npm instalados digitando `node -v` e `npm -v` na janela do seu terminal

### Instalar e Rodar o Ghost


**Se você está usando o Linux no seu desktop siga esses passos:**

*   Na [página de downloads](https://ghost.org/download/), pressione o botão para baixar a última versão em um arquivo .zip & então extraia para o local que você quer rodar o Ghost.


**Se você está utilizando o linux como um sistema virtual ou via SSH e só tem o acesso ao terminal, então use:**

*   No terminal use o comando para baixar a última versão do Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Extraia o arquivo e modifique a pasta utilizando o seguinte comando:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Depois de extraído com sucesso, abra o terminal caso você ainda não tenha aberto ainda, então:**

*   Mude para o diretório que você extraiu o Ghost com o seguinte comando:

    ```
    $ cd /path/to/ghost
    ```

*   Para o tipo de instalação do Ghost:

    ```
    npm install --production
    ```
    <span class="note">note que são dois traços</span>

*   Quando o npm terminar a instalação, digite o seguinte comando para rodar o Ghost no modo de desenvolvimento:

    ```
    $ npm start
    ```

*   O Ghost estará rodando agora em **127.0.0.1:2368**<br />
    <span class="note">Você pode ajustar o endereço de IP e porta em **config.js**</span>

*   No browser, navegue [http://127.0.0.1:2368](http://127.0.0.1:2368) para ver o seu mais novo blog Ghost
*   Modifique a url para [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) e crie seu usuário de administração para logar no painel administrativo do Ghost