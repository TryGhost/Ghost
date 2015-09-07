---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt_BR/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
canonical: http://support.ghost.org/how-to-upgrade/
redirectToCanonical: true
---

# Atualizando o Ghost <a id="upgrade"></a>

Atualizar o Ghost é super fácil e direto.

Existem algumas maneiras diferentes que você pode querer fazer isso. A seguir iremos falar o que precisa ser feito, e cobrir o processo passo-a-passo para ambos, o [estilo apontar-e-clicar](#how-to) e via [linha de comando](#cli), então você está livre para escolher o método que você se sente mais confortável.

<p class="note"><strong>Faça Backup!</strong> Sempre faça um backup antes de atualizar. Leia as <a href="#backing-up">instruções de backup</a> antes!</p>

## Overview

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost, uma vez que instalado, tem uma estrutura de pastas semelhantes à mostrada ao lado. Existem dois diretórios principais, <code class="path">content</code> and <code class="path">core</code>, e mais uns arquivos no diretório raiz.

Atualizar o Ghost é uma questão de substituir os arquivos antigos pelos novos, rodar novamente o `npm install` para atualizar a pasta <code class="path">node_modules</code> e reiniciar o Ghost para fazer as mudanças terem efeito.

Lembre-se, por padrão o Ghost arquiva todos os arquivos personalizados, temas, images, etc na pasta <code class="path">content</code> , então você deve deixar ela salva! Substitua somente os arquivos do <code class="path">core</code> e da pasta raiz, e tudo ficará bem.

## Fazendo o Backup <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   Para salvar toda a informação do seu banco de dados, entre na sua instalação do Ghost e vá para <code class="path">/ghost/debug/</code>. Aperte o botão exportar e faça download do arquivo JSON contendo toda a sua informação. Feito.
*   Para salvar os temas personalizados e imagens, você precisa copiar os arquivos dentro da pasta <code class="path">content/themes</code> e <code class="path">content/images</code>

<p class="note"><strong>Nota:</strong> Você pode, se quiser, fazer uma cópia do banco de dados em <code class="path">content/data</code> mas <strong>fique avisado</strong> que você não deve fazer isso se o Ghost estiver rodando. Por favor pare ele antes.</p>


## Como Atualizar <a id="how-to"></a>

Como atualizar na sua máquina local

<p class="warn"><strong>AVISO:</strong> <strong>NÃO</strong> copie e cole o diretório inteiro do Ghost em cima da instalação existente no Mac. <strong>NÃO</strong> escolha <kbd>SUBSTITUIR</kbd> se você está enviando os arquivos pelo Transmit ou outro software FTP, escolha <strong>MESCLAR</strong>.</p>

*   Baixe a última versão do Ghost em [Ghost.org](http://ghost.org/download/)
*   Extraia o arquivo .zip em um diretório temporário
*   Copie todo os arquivos do diretório raiz da última versão. Isso inclui: index.js, package.json, Gruntfile.js, config.example.js, a licença e o arquivo README.
*   Depois substitua o antigo diretório <code class="path">core</code> pelo novo diretório <code class="path">core</code>.
*   Para lançamentos incluindo atualizações do tema Casper (o tema padrão), substitua o antigo diretório <code class="path">content/themes/casper</code> pelo novo diretório
*   Rode `npm install --production`
*   Finalmente, reinicie o Ghost para que as mudanças façam efeito

## Command line only <a id="cli"></a>

<p class="note"><strong>Back-it-up!</strong> Always perform a backup before upgrading. Read the <a href="#backing-up">backup instructions</a> first!</p>

### Somente Linha de Comando no Mac <a id="cli-mac"></a>

A captura de tela abaixo mostra os passos de atualizar o Ghost quando o arquivo .zip foi baixado em <code class="path">~/Downloads</code> e o Ghost instalado em <code class="path">~/ghost</code> <span class="note">**Nota:** `~` Significa o diretório "home" do usuário no Mac ou no Linux</span>

![Upgrade ghost](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

Os passos no tutorial em vídeo:

*   <code class="path">cd ~/Downloads</code> - muda o diretório para o Downloads, aonde a última versão do Ghost foi salva
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - Extrai o Ghost na pasta <code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - muda a pasta para <code class="path">ghost-0.4.0</code> directory
*   `ls` - Mostra todos os arquivo dentro desse diretório
*   `cp *.js *.json *.md LICENSE ~/ghost` - Copia todos os arquivos .md .js .txt e .json dessa pasta para a pasta <code class="path">~/ghost</code>
*   `rm -rf ~/ghost/core` - delete the old <code class="path">core</code> directory
*   `cp -R core ~/ghost` - copia o diretório <code class="path">core</code> e todos os arquivos dentro dele para <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - copia o diretório <code class="path">casper</code> e todos os arquivos dentro dele para <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - muda o diretório para o <code class="path">~/ghost</code> directory
*   `npm install --production` - instala o Ghost
*   `npm start` - inicia o Ghost

### Linha de comando em servidores linux <a id="cli-server"></a>

*   Primeiro você precisa descobrir a URL da última versão do Ghost. Ela deve ser algo como `http://ghost.org/zip/ghost-latest.zip`.
*   Baixe o arquivo zip com o comando `wget http://ghost.org/zip/ghost-latest.zip` (ou qualquer que seja a URL da última versão do Ghost).
*   Exclua o diretório do núcleo antigo da sua instalação
*   Extraia o arquivo com `unzip -uo ghost-latest.zip -d path-to-your-ghost-install`
*   Rode `npm install --production` para baixar as novas dependências
*   Finalmente, reinicie o Ghost para que as mudanças façam efeito

**Adicionalmente**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) também tem instruções para atualizar o Ghost em servidores linux.

### Como atualizar um Droplet DigitalOcean <a id="digitalocean"></a>

<p class="note"><strong>Faça Backup!</strong> Sempre faça um backup antes de atualizar. Leia as <a href="#backing-up">instruções de backup</a> antes!</p>

*   Primeiro você precisa descobrir a URL da última versão do Ghost. Ela deve ser algo como `http://ghost.org/zip/ghost-latest.zip`.
*   Uma vez que você conseguir a URL da última versão, no console do seu Droplet digite `cd /var/www/` para mudar para o diretório aonde o código do Ghost vive.
*   Depois, digite `wget http://ghost.org/zip/ghost-latest.zip` (ou qualquer que seja a URL da última versão do Ghost).
*   Extraia o arquivo com o comando, `rm -rf ghost/core`
*   Unzip the archive with `unzip -uo ghost-latest.zip -d ghost`
*   Tenha certeza que todos os arquivos estejam com as permissões corretas digitando `chown -R ghost:ghost ghost/*`
*   Mude para o diretório <code class="path">ghost</code> com `cd ghost`
*   Rode `npm install --production` para baixar as novas dependências
*   Finalmente, reinicie o Ghost para que as mudanças façam efeito usando `service ghost restart` (isso pode demorar um pouco)


## Como atualizar o Node.js para a última versão <a id="upgrading-node"></a>

Se você originalmente instalou o Node.js pelo site do [Node.js](nodejs.org), você pode atualizar o Node.js para a última versão baixando e rodando o último instalador. Isso irá substituir a versão instalada pela nova versão.

Se você está no Ubuntu, ou outra distribuição que use o `apt-get`, o comando para atualizar o node é o mesmo da comando da instalação: `sudo apt-get install nodejs`.

Você **não** precisa de reiniciar o servidor ou o Ghost.