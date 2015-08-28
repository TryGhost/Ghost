---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
permalink: /pt_BR/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Colocando o Ghost no Ar <a id="deploy"></a>

Então você está pronto para colocar o Ghost no ar? Excelente!

A primeira decisão que você precisa fazer, é se você quer instalar e configurar o Ghost você mesmo, ou se prefere usar algum instalador.

### Instaladores

Existem alguns opções de instaladores simples no momento:

*   Publicar na nuvem com [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Lançar o Ghost com [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Colocar no ar e rodando usando um [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Configuração Manual

Você irá precisar de um servidor que já tenha, ou lhe permita instalar o [Node.js](http://nodejs.org).
    Isso significa algo como o ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) ou outro que lhe conceda acesso SSH (terminal) & que permita instalar o Node.js. Existem vários servidores do tipo, e eles podem ser bem baratos.

O que não irá funcionar no momento é uma hospedagem compartilhada (como aquelas que usam o cPanel), esse tipo de hospedagem normalmente é destinado a aplicativos que rodam algo como o PHP. Alguns já oferecem suporte ao Ruby, e talvez um dia irão oferecer suporte ao Node.js ou algo similar.

Infelizmente alguns servidores cloud específicos para utilizar o Node.js como o **Nodejitsu** & **Heeroku** **NÃO** são compatíveis com o Ghost. Eles irão funcionar no início, mas irão deletar seus arquivos, imagens e seu banco de dados irá desaparecer. O Heroku suporta MySQL e você pode usa-lo, porém você ainda assim irá perder suas imagens enviadas.

Os links a seguir contém instruções de como configurar e rodar com:

*   [A2 Hosting](http://www.a2hosting.com/high-speed-ghost-hosting) - (autoinstaller)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - por [Corbett Barr](http://ghosted.co)
*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - por [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - por [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - por [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - por [Gregg Housh](http://0v.org/)
*   ...veja o [forum de instalação](https://en.ghost.org/forum/installation) para mais guias...

## Fazendo o Ghost rodar ininterruptamente

O método anterior descrito para iniciar o Ghost é usando o comando `npm start`. Essa é uma boa maneira para um ambiente local de desenvolvimento, mas se você usar a linha de comando para iniciar o Ghost, ele irá parar sempre que você fechar a janela do terminal ou sair do SSH. Para evitar que o Ghost pare, você tem que rodar ele como um serviço. Existem duas maneiras de fazer isso.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Você pode usar o `forever` para rodar o Ghost como uma tarefa em plano de fundo. O `forever` irá tomar conta para que sua instalação fique sempre no ar, reiniciando-a caso ele dê algum erro.

*   Para instalar o `forever` digite `npm install forever -g`
*   Para iniciar o Ghost usando o `forever` do diretório da instalação do Ghost digite `NODE_ENV=production forever start index.js`
*   Para parar o processo do Ghost digite `forever stop index.js`
*   Para saber se o Ghost está rodando no momento use o comando `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Distribuições Linux populares com o Fedora, Debian, and Ubuntu&mdash;possuem um pacote do Supervisor: Um sistema de controle de processos que o permite de rodar o Ghost ao iniciar a máquina, sem utilizar scripts do tipo init. Diferente de um script do tipo init, o Supervisor é compatível com várias distribuições linux e suas versões.

*   [Instale o Supervisor](http://supervisord.org/installing.html) como requerimento em sua distribuição Linux. Normalmente você irá usar esses comandos:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Maioria das outras distribuições: `easy_install supervisor`
*   Tenha certeza que o Supervisor está rodando, digitando `service supervisor start`
*   Crie um script para sua instalação do Ghost. Normalmente isso irá ser salvo em `/etc/supervisor/conf.d/ghost.conf`, Por exemplo:

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   Iniciar o Ghost utilizando o Supervisor: `supervisorctl start ghost`
*   Para parar o Ghost: `supervisorctl stop ghost`

Você pode ver a [documentação do Supervisor](http://supervisord.org) para mais informações.

### Init Script <a id="init-script"></a>

Sistemas Linux utilizam scripts init para rodar um processo quando o sistema iniciar. Esses scripts ficam em /etc/init.d. Para fazer o Ghost rodar sempre, mesmo que a máquina seja reiniciada, você pode usar os scripts init para isso. O exemplo a seguir irá funcionar no Ubuntu e foi testado no **Ubuntu 12.04**.

*   Criar o arquivo /etc/init.d/ghost com o seguinte comando:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Abra o arquivo com o `nano /etc/init.d/ghost` e verifique se:
*   Altere o `GHOST_ROOT` variável para o caminho onde você instalou o Ghost
*   Verifique se a variável `DAEMON` é a mesmo que a saída do `which node`
*   O script Init é executado com seu próprio usuário do Ghost e seu grupo, no seu sistema, vamos criá-lo com a seguinte maneira:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Let's also make sure the Ghost user can access the installation:Vamos também ter certeza de que o usuário do Ghost pode acessar a instalação:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Altere a permissão de execução para o script de inicialização, digitando

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Agora você pode controlar o Ghost com os seguintes comandos:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Para iniciar o Ghost quando o sistema iniciar o script de inicialização recém-criado tem que ser registrado logo no começo.
    Digite os dois comandos a seguir com linha de comando:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Vamos ter certeza que seu usuário pode alterar arquivos, config.js por exemplo, no diretório do Ghost, atribuindo-lhe para o grupo do ghost:

    ```
    $ sudo adduser USERNAME ghost
    ```

*   Se agora você reiniciar o seu servidor Ghost já deve estar funcionando para você.


## Configurando o Ghost com um domínio <a id="nginx-domain"></a>

Se você configurou o Ghost para rodar para sempre, você também pode configurar um servidor web como um proxy para servir o seu blog com o seu domínio.
Neste exemplo, vamos supor que você está usando o **Ubuntu 12.04** e usa o **nginx** como servidor web.
Ele também assume que o Ghost é executado em segundo plano com uma das formas acima mencionadas.

*   Instalando o nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Este comando irá instalar o nginx e configurando todos os diretórios necessários e configurações básicas.</span>

*   Configurando o seu site

    *   Crie um novo arquivo no `/etc/nginx/sites-available/ghost.conf`
    *   Abra o arquivo com um editor de texto (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        e cole o seguinte código

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   Modifique o `server_name` para o seu dominio
    *   Symlink sua configuração em `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Restart o nginx

    ```
    $ sudo service nginx restart
    ```

## Configurando o Ghost com SSL <a id="ssl"></a>

Depois de configurar um domínio personalizado é sempre bom garantir a interface de administração ou talvez todo o seu blog usando HTTPS. Aconselha-se a proteger a interface de administração com HTTPS porque nome de usuário e senha serão transmitidos em texto simples se você não ativar a criptografia.

O exemplo a seguir irá mostrar-lhe como configurar o SSL. Nós assumimos que você seguiu este guia até agora e usa o nginx como seu servidor de proxy. A configuração com outro servidor proxy deve ser semelhante.

Primeiro você precisa obter um certificado SSL de um fornecedor de sua confiança. Seu provedor irá guiá-lo através do processo de gerar sua chave privada e a solicitação de assinatura de certificado (CSR). Depois de ter recebido o arquivo de certificado você tem que copiar o arquivo CRT de seu provedor de certificado eo arquivo de chave que é gerada durante a emissão do CSR para o servidor.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Após esses dois arquivos estão no lugar que você precisa para atualizar o arquivo configuration do servidor nginx.

*   Abra o arquivo de configuração do nginx com um editor de texto (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Adicione as configurações indicadas com um parte a mais para o seu arquivo de configuração:

    ```
     server {
         listen 80;
    +    listen 443 ssl;
         server_name example.com;
    +    ssl_certificate        /etc/nginx/ssl/server.crt;
    +    ssl_certificate_key    /etc/nginx/ssl/server.key;
         ...
         location / {
    +       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    +       proxy_set_header Host $http_host;
    +       proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:2368;
            ...
         }
     }
    ```

    *   Restart o nginx

    ```
    $ sudo service nginx restart
    ```

Após esses passos, você deve ser capaz de chegar à área de administração do seu blog usando uma conexão segura HTTPS. Se você quiser forçar todo o seu tráfego para usar o SSL, é possível alterar o protocolo da configuração url no arquivo config.js para https (por exemplo: 'https://my-ghost-blog.com'`). Isto irá forçar o uso de SSL para o front-end e para a administração. Todos os pedidos enviados por HTTP serão redirecionados para HTTPS. Se você incluir imagens em seu post que são pegos a partir de domínios que estão usando HTTP um aviso de "conteúdo inseguro' aparecerá. Scripts e fontes de domínios HTTP irão parar de funcionar.

Na maioria dos casos você vai querer forçar SSL para a interface de administração e para o front-end utilizar HTTP e HTTPS. Para forçar SSL para a área administrativa a opção `forceAdminSSL: true` foi introduzido.

Se precisar de mais informações sobre como configurar o SSL para o servidor proxy a documentação oficial do SSL [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) e [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) são um lugar perfeito para começar.
