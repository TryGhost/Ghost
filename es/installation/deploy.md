---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blogging Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---
## Descargar Ghost <a id="deploy"></a>

Así que estas listo para publicar usando Ghost? Excelente!

La primera decisión que debes tomar es si prefieres instalar y establecer Ghost manualmente por ti mismo o si prefieres usar un instalador.

### Instaladores

En este momento hay algunas opciones para instaladores que son simples:

*   Implementa en la nube con [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Comenzar Ghost con [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Empezar con un [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Instalación Manual

Necesitaras un plan de *hosting* que ya tenga o te permita instalar [Node.js](http://nodejs.org).
    Esto significa algo la nube como ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) o cualquier otro plan que tenga acceso a SSH (terminal) y te permita instalar Node.js. Hay muchos y en gran parte son bastante económicos.

Lo que no funciona en este momento es el hosting compartido estilo cPanel, ya que generalmente se dedican al hosting de PHP. Sin embargo, algunos ofrecen Ruby, así que es posible que puedan ofrecer Node.js en el futuro, ya que son similares.

<p>Desafortunadamente, muchas de las soluciones en la nube que son específicamente para Node como **Nodejitsu** y **Heroku**, **NO SON** compatibles con Ghost. Funcionarán al principio pero después borrarán tus archivos, por lo tanto tus imágenes y base de datos desaparecerán. Heroku es compatible con MySQL así que podrías usalo, pero aún vas a perder todas tus imágenes.

Los siguientes link contienen instrucciones sobre la configuración con:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - de [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - por [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - por [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - por [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - por [Gregg Housh](http://0v.org/)
*   ...visita el [forum de installción](https://en.ghost.org/forum/installation) para más guías...

## Usar Ghost ininterrumpidamente

El método descrito anteriormente para iniciar Ghost es `npm start`. Es bueno para desarrollar y poner a prueba localmente, pero iniciar Ghost con la línea de comandos  resulta en el la interrupción de Ghost cada vez que cierras el terminal o terminas la sesión de SSH. Para evitar la interrupción de Ghost, debes ejecutar Ghost como un servicio. Hay dos maneras de lograr esto.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Puedes usar `forever` para ejecutar Ghost en segundo plano. `forever` también se encargará de tu instalación de Ghost y de reiniciar el proceso node en caso de caídas.

*   Para instalar `forever` usa el comando `npm install forever -g`
*   Para iniciar Ghost usando `forever` desde el directorio de instalación de Ghost usa el comando `NODE_ENV=production forever start index.js`
*   Para terminar o parar Ghost usa el comando `forever stop index.js`
*   Para ver si Ghost está en ejecución usa el comando `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Distribuciones populares de Linux&mdash;como Fedora, Debian, and Ubuntu&mdash;mantienen un paquete para Supervisor: un sistema gestor de procesos que te permite ejecutar Ghost al iniciar sin tener que usar script de init. A diferencia de el script de init, Supervisor es portátil entre distribuciones y versiones de Linux.

*   [Instala Supervisor](http://supervisord.org/installing.html) según los requisitos de tu distribución de Linux. Típicamente, los comandos son:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Mayoría de otras distribuciones: `easy_install supervisor`
*   Asegúrate que Supervisor esta en ejecución usando el comando `service supervisor start`
*   Crea un script de inicio para tu instalación de Ghost. Típicamente, este va escrito en `/etc/supervisor/conf.d/ghost.conf` Por ejemplo:

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

*   Iniciar Ghost usando Supervisor: `supervisorctl start ghost`
*   Terminar Ghost: `supervisorctl stop ghost`

Puedes ver la [documentación de Supervisor](http://supervisord.org) para obtener más información.

### Init Script <a id="init-script"></a>

Los sistemas Linux usan init scripts para iniciar el boot del sistema. Estos scripts están en /etc/init.d. Para mantener Ghost ininterrumpidamente aún después de reiniciar el sistema, puedes usar un init script. El siguiente ejemplo funciona en Ubuntu y fue probado en **Ubuntu 12.04**.

*   Crea el archivo /etc/init.d/ghost con el siguiente comando:

    ```
    $ sudo curl https://raw.github.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Abre el archivo con `nano /etc/init.d/ghost` y verifica lo siguiente:
*   Cambia la variable `GHOST_ROOT` al camino donde está instalado Ghost
*   Comprueba si la variable `DAEMON` es igual al resultado del comando `which node`
*   El Init script es ejecutado con su propio usuario y grupo de Ghost en tu sistema, y los creamos de la siguiente manera:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Asegurémonos que el usuario Ghost tengo acceso a la instalación:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Cambia los permisos de ejecución del init script:

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Y ahora puedes controlar Ghost con estos comandos:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Para iniciar Ghost al inicio boot del sistema, tienes que registrar el nuevo init script para ejecución.
    Usa estos comandos:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Asegúrate que tu usuario pueda hacer cambios a archivos, como config.js en el directorio Ghost por ejemplo, te tienes que asignar al grupo de Ghost:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   Si reinicias el servidor, Ghost debería estar ya funcionando.


## Configurando Ghost con un nombre de dominio <a id="nginx-domain"></a>

Si ya tienes Ghost en ejecución ininterrumpida, puedes también configurar un servidor web como un proxy para servir tu blog con tu propio dominio.
En este ejemplo vamos a suponer que usas **Ubuntu 12.04** y usas **nginx** como servidor web.
También suponemos que Ghost es ejecutado a segundo plano con una de las formas anteriores.

*   Instala nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Esto instalará nginx y creará todos los directorios necesarios y configuraciones básicas.</span>

*   Configura tu página

    *   Crea un archivo nuevo en `/etc/nginx/sites-available/ghost.conf`
    *   Abre el archivo con un editor de texto (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        y pega lo siguiente:

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

    *   Cambia `server_name` a tu dominio
    *   Crea un Symlink de tu configuración en `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Reinicia nginx

    ```
    $ sudo service nginx restart
    ```

## Configurando Ghost con SSL <a id="ssl"></a>

Después de configurar tu propio dominio, sería bueno asegurar la interfaz de administración o  también el resto de tu blog usando HTTPS. Es aconsejable la protección de la interfaz de administración con HTTPS porque el nombre de usuario y contraseña son transmitidos en texto llano si no activas cifrado o encripción.

El siguiente ejemplo muestra cómo configurar SSL. Suponemos que haz seguido esta guía desde el principio y por lo tanto usas nginx como servidor proxy. Configuración con algún otro servidor proxy debería ser bastante similar.

Primero tienes que obtener un certificado SSL de un proveedor de confianza. Tu proveedor te dará instrucciones para generar tu clave privada y CSR (certificate signing request). Después de haber recibido el certificado, copia el archivo CRT de tu proveedor de certificado y el archivo KEY generado durante la emisión del CSR al servidor.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Después que estos dos archivos esten en su lugar, debes actualizar tu configuración nginx.

*   Abre el archivo de configuración nginx con un editor de texto (por ejemplo `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Añade los ajustes indicados a continuación con `+` a tu archivo de configuración:

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

    *   Reinicia nginx

    ```
    $ sudo service nginx restart
    ```

Después de estos pasos, debería ser posible abrir la página de administración de tu blog a través de una conexión segura con HTTPS. Si quieres que todo tu tráfico use SSL, es posible cambiar el protocolo de la configuración url a https en tu archivo config.js (por ejemplo: `url: 'https://my-ghost-blog.com'`). Esto forzará el uso de SSL para frontend y administración. Cualquier petición a través HTTP será redirigida a HTTPS. Si incluyes alguna imagen en tu post que es de un dominio HTTP, resultará en una advertencia 'insecure content'. Scripts y fonts desde dominios HTTP no funcionarán.

En la mayoría de los casos querrás forzar SSL para la interfaz de administración y servir el frontend a través HTTP y HTTPS. La opción `forceAdminSSL: true` fue introducida para forzar SSL en la página de administración.

Si necesitas más información sobre configuración SSL para tu servidor proxy, la documentación oficial de [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) y [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) son un lugar perfecto para empezar.
