---
lang: pt-BR
layout: default
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt-BR/installation/upgrading/
chapter: installation
prev_section: deploy
next_section: troubleshooting
---

<div class="container">
    <div class="row">
        {% include subnav/installation.html %}

        <section id="content" class="col-lg-9">

            <h1 id="upgrade">Atualizando o Ghost</h1>

            <p>Atualizar o Ghost é super fácil e direto.</p>
            <p>Existem algumas maneiras diferentes que você pode querer fazer isso. A seguir iremos falar o que precisa ser feito, e cobrir o processo passo-a-passo para ambos, o <a href="#how-to">estilo apontar-e-clicar</a> e via <a href="#cli">linha de comando</a>, então você está livre para escolher o método que você se sente mais confortável.</p>

            <p class="note"><strong>Faça Backup!</strong> Sempre faça um backup antes de atualizar. Leia as <a href="#backing-up">instruções de backup</a> antes!</p>

            <h2>Overview</h2>

            <img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

            <p>Ghost, uma vez que instalado, tem uma estrutura de pastas semelhantes à mostrada ao lado. Existem dois diretórios principais, <code class="path">content</code> e <code class="path">core</code>, e mais uns arquivos no diretório raiz.</p>

            <p>Atualizar o Ghost é uma questão de substituir os arquivos antigos pelos novos, rodar novamente o <code>npm install</code> para atualizar a pasta <code class="path">node_modules</code> e reiniciar o Ghost para fazer as mudanças terem efeito.</p>

            <p>Lembre-se, por padrão o Ghost arquiva todos os arquivos personalizados, temas, images, etc na pasta <code class="path">content</code>, então você deve deixar ela salva! Substitua somente os arquivos do <code class="path">core</code> e da pasta raiz, e tudo ficará bem.</p>

            <br />
            <h2 id="backing-up">Fazendo o Backup (Cópia de Segurança)</h2>

            <img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

            <ul>
                <li>Para salvar toda a informação do seu banco de dados, entre na sua instalação do Ghost e vá para <code class="path">/ghost/debug/</code>. Aperte o botão exportar e faça download do arquivo JSON contendo toda a sua informação. Feito</li>
                <li>Para salvar os temas personalizados e imagens, você precisa copiar os arquivos dentro da pasta <code class="path">content/themes</code> e <code class="path">content/images</code></li>
            </ul>
            <p class="note"><strong>Nota:</strong> Você pode, se quiser, fazer uma cópia do banco de dados em <code class="path">content/data</code> mas <strong>fique avisado</strong> que você não deve fazer isso se o Ghost estiver rodando. Por favor pare ele antes.</p>

            <h2 id="how-to">Como Atualizar</h2>

            <p>Como atualizar na sua máquina local</p>

            <p class="warn"><strong>AVISO:</strong> <strong>NÃO</strong> copie e cole o diretório inteiro do Ghost em cima da instalação existente no Mac. <strong>NÃO</strong> escolha <kbd>SUBSTITUIR</kbd> se você está enviando os arquivos pelo Transmit ou outro software FTP, escolha <strong>MESCLAR (MISTURAR)</strong>.</p>

            <ul>
                <li>Baixe a última versão do Ghost em <a href="http://ghost.org/download/">Ghost.org</a></li>
                <li>Extraia o arquivo .zip em um diretório temporário</li>
                <li>Copie todo os arquivos do diretório raiz da última versão. Isso inclui: index.js, package.json, Gruntfile.js, config.example.js, a licença e o arquivo README.</li>
                <li>Depois substitua o antigo diretório <code class="path">core</code> pelo novo diretório <code class="path">core</code></li>
                <li>Para lançamentos incluindo atualizações do tema Casper (o tema padrão), substitua o antigo diretório <code class="path">content/themes/casper</code> pelo novo diretório.</li>
                <li>Rode <code>npm install --production</code></li>
                <li>Finalmente, reinicie o Ghost para que as mudanças façam efeito.</li>
            </ul>


            <h2 id="cli">Somente Linha de Comando</h2>

            <p class="note"><strong>Faça Backup!</strong> Sempre faça um backup antes de atualizar. Leia as <a href="#backing-up">instruções de backup</a> antes!</p>

            <h3 id="cli-mac">Linha de comando no Mac</h3>

            <p>A captura de tela abaixo mostra os passos de atualizar o Ghost quando o arquivo .zip foi baixado em <code class="path">~/Downloads</code> e o Ghost instalado em <code class="path">~/ghost</code> <span class="note"><strong>Nota:</strong> <code>~</code> Significa o diretório "home" do usuário no Mac ou no Linux</span></p>

            <img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif" width="100%" />

            <p>Os passos no tutorial em vídeo
                <ul>
                    <li><code class="path">cd ~/Downloads</code> - muda o diretório para o Downloads, aonde a última versão do Ghost foi salva.<li>
                    <li><code>unzip ghost-0.3.1.zip -d ghost-0.3.3</code> - Extrai o Ghost na pasta <code class="path">ghost-0.3.3</code></li>
                    <li><code class="path">cd ghost-0.3.3</code> - muda a pasta para <code class="path">ghost-0.3.3</code></li>
                    <li><code>ls</code> - Mostra todos os arquivo dentro desse diretório</li>
                    <li><code>cp *.md *.js *.txt *.json ~/ghost</code> - Copia todos os arquivos .md .js .txt e .json dessa pasta para a pasta <code class="path">~/ghost</code></li>
                    <li><code>cp -R core ~/ghost</code> - copia o diretório <code>core</code> e todos os arquivos dentro dele para o diretório <code class="path">~/ghost</code></li>
                    <li><code>cp -R content/themes/casper ~/ghost/content/themes</code> - copia o diretório <code class="path">casper</code> e todos os arquivos dentro dele para <code class="path">~/ghost/content/themes</code></li>
                    <li><code>cd ~/ghost</code> - muda o diretório para o <code class="path">~/ghost</code></li>
                    <li><code>npm install --production</code> - instala o Ghost</li>
                    <li><code>npm start</code> - inicia o Ghost</li>
                </ul>
            </p>

            <h3 id="cli-server">Linha de comando em servidores linux</h3>

            <ul>
                <li>Primeiro você precisa descobrir a URL da última versão do Ghost. Ela deve ser algo como <code>http://ghost.org/zip/ghost-latest.zip</code>.</li>
                <li>Baixe o arquivo zip com o comando <code>wget http://ghost.org/zip/ghost-latest.zip</code> (ou qualquer que seja a URL da última versão do Ghost).</li>
                <li>Extraia o arquivo com <code>unzip -uo ghost-0.3.*.zip -d path-to-your-ghost-install</code></li>
                <li>Rode <code>npm install --production</code> para baixar as novas dependências</li>
                <li>Finalmente, reinicie o Ghost para que as mudanças façam efeito</li>
            </ul>

            <p><strong>Adicionalmente</strong>, <a href="http://www.howtoinstallghost.com/how-to-update-ghost/">howtoinstallghost.com</a> também tem instruções para atualizar o Ghost em servidores linux.</p>

            <h3 id="digitalocean">Como atualizar um Droplet DigitalOcean</h3>

            <p class="note"><strong>Faça Backup!</strong> Sempre faça um backup antes de atualizar. Leia as <a href="#backing-up">instruções de backup</a> antes!</p>

            <ul>
            <li>Primeiro você precisa descobrir a URL da última versão do Ghost. Ela deve ser algo como <code>http://ghost.org/zip/ghost-latest.zip</code>.</li>
            <li>Uma vez que você conseguir a URL da última versão, no console do seu Droplet digite <code>cd /var/www/</code> para mudar para o diretório aonde o código do Ghost vive.</li>
            <li>Depois, digite <code>wget http://ghost.org/zip/ghost-latest.zip</code> (ou qualquer que seja a URL da última versão do Ghost).</li>
            <li>Extraia o arquivo com o comando <code>unzip -uo ghost-0.3.*.zip -d ghost</code></li>
            <li>Tenha certeza que todos os arquivos estejam com as permissões corretas digitando <code>chown -R ghost:ghost ghost/*</code></li>
            <li>Rode <code>npm install</code> para baixar as novas dependências</li>
            <li>Finalmente, reinicie o Ghost para que as mudanças façam efeito usando <code>service ghost restart</code></li>
            </ul>


            <h2 id="upgrading-node">Como atualizar o Node.js para a última versão</h2>

            <p>Se você originalmente instalou o Node.js pelo site do <a href="nodejs.org">Node.js</a>, você pode atualizar o Node.js para a última versão baixando e rodando o último instalador. Isso irá substituir a versão instalada pela nova versão.</p>
            <p>Se você está no Ubuntu, ou outra distribuição que use o <code>apt-get</code>, o comando para atualizar o node é o mesmo da comando da instalação: <code>sudo apt-get install nodejs</code>.</p>

            <p>Você <strong>não</strong> precisa de reiniciar o servidor ou o Ghost.</p>


            {% if page.next_section || page.prev_section %}
                {% include pagination.html %}
            {% endif %}
        </section>
    </div>
</div>