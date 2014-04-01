---
layout: installation
meta_title: Como instalar Ghost en tu Servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para instalar y correr la plataforma Ghost en tu ambiente local o remoto.
heading: Instalando Ghost
subheading: Los primeros pasos para configurar tu nuevo blog por primera vez.
permalink: /es/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---

# Instalando en Linux <a id="install-linux"></a>

### Instala Node

*   Puedes descargar el archivo `.tar.gz` desde [http://nodejs.org](http://nodejs.org), o puedes preferir seguir las instrucciones en cómo [instalar desde un gestor de paquetes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Revisa que tienes Node y npm instalados escribiendo `node -v` y `npm -v` en una terminal.

### Instala e Inicia Ghost

**Si en tu computador usas Linux sigue los siguientes pasos:**

*   Inicia sesión en [http://ghost.org](http://ghost.org), y haz click en el botón azul 'Download Ghost Source Code'.
*   En la página de descargas presiona el botón para descargar la versión más reciente y descomprime el archivo en la ubicación donde quieras correr Ghost.

**Si estás usando Linux como invitado o a través de SSH y sólo tienes la terminal, entonces:**

*   Usa el siguiente comando para descargar la versión más reciente de Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Descomprime el archivo y muévete al directorio usando lo siguiente:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```

**Después de que extraer correctamente Ghost abre una terminal, si no lo has hecho, y entonces:**

*   Ubícate en la carpeta que donde extraíste Ghost con el siguiente comando: 

    ```
    $ cd /path/to/ghost
    ```

*   Para instalar Ghost escribe:

    ```
    npm install --production
    ```
    <span class="note">nota las dos líneas</span>

*   Cuando npm acabe de instalar, escribe lo siguiente para iniciar Ghost en modo desarrollador:

    ```
    $ npm start
    ```

*   Ghost estará ahora corriendo en **127.0.0.1:2368**<br />
    <span class="note">Puedes configurar la dirección IP y el puerto en **config.js**</span>

*   En un navegador, ve a [http://127.0.0.1:2368](http://127.0.0.1:2368) para ver tu nueva instalación de Ghost.
*   Cambia la url a [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) y crea tu usuario para acceder al administrador de Ghost.