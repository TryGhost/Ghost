---
lang: pt-BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt-BR/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# Resolução de Problemas & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' não parece estar no meu $PATH</dt>
    <dd>Você pode adiciona-lo realizando os passos a seguir:
        <ul>
            <li>Numa janela do seu terminal digite <code>cd ~</code>, isso irá o levar para seu diretório home</li>
            <li>Agora digite <code>ls -al</code> para mostrar todos os arquivos e pastas, incluindo os invisíveis</li>
            <li>Você deve ver um arquivo chamado <code class="path">.profile</code> ou <code class="path">.bash_profile</code> caso nenhum exista, digite <code>touch .bash_profile</code> para cria-lo</li>
            <li>A seguir, digite <code>open -a Textedit .bash_profile</code> para abri-lo utilizando o Textedit.</li>
            <li>Adicione <code>export PATH=$PATH:/usr/local/bin/</code> ao fim do arquivo, e salve-o.</li>
            <li>Essa nova configuração irá ser carregada assim que um novo terminal iniciar, então inicie uma nova aba ou janela do terminal e digite <code>echo $PATH</code> para ver que '/usr/local/bin/' está agora presente.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 não quer instalar</dt>
    <dd>
        <p>O pacote do SQLite 3 vem com binários pré-compilados para as arquiteturas mais comuns. Se você está usando uma arquitetura menos popular, ou outro tipo de unix, você poderá receber um erro 404 do SQLite 3 porque o binário não foi encontrado para sua plataforma.</p>
        <p>Isso pode ser corrigido forçando a compilação do SQLite 3. Isso irá requerer os pacotes python & gcc. Tente fazer isso rodando <code>npm install sqlite3 --build-from-source</code></p>
        <p>Se mesmo assim ele não conseguir compilar, provavelmente está faltando alguma dependência do python ou do gcc em seu ambiente. No linux tente rodar <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> e <code>sudo apt-get install python-software-properties python g++ make</code> antes de tentar compilar novamente o código fonte.</p>
        <p>Para mais informações sobre como compilar os binários, por favor veja: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Assim que você tiver conseguido compilar o binário para sua plataforma, por favor siga as <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instruções</a> para enviar o binário para o projeto node-sqlite, assim futuros usuários não terão esse mesmo problema.</p>
    </dd>
    <dt id="image-uploads">Eu não consigo enviar minhas imagens</dt>
    <dd>
        <p>Se você está em uma instalação no DigitalOcean Droplet que foi configurado quando o Ghost estava na v0.3.2, ou você está usando o nginx em alguma outra plataforma, você pode ter problemas ao enviar suas imagens.</p>
        <p>O que está acontecendo provavelmente, é que você não consegue enviar imagens maiores que 1MB (tente uma imagem menor, isso deve funcionar). Esse é um limite muito pequeno!</p>
        <p>Para aumentar esse limite você precisa editar o arquivo de configuração do nginx, e alterar o limite para outro qualquer.</p>
        <ul>
            <li>Entre no seu servidor e digite <code>sudo nano /etc/nginx/conf.d/default.conf</code> para abrir o arquivo de configuração.</li>
            <li>Depois da linha <code>server_name</code>, adicione o código a seguir: <code>client_max_body_size 10M;</code></li>
            <li>Finalmente, aperte <kbd>ctrl</kbd> + <kbd>x</kbd> para sair. O Nano irá perguntar se você quer salvar o arquivo, digite <kbd>y</kbd> para sim, e aperte <kbd>enter</kbd> para salvar o arquivo.</li>
        </ul>
    </dd>
</dl>