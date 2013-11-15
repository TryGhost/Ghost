---
lang: es
layout: installation
meta_title: Cómo instalar Ghost en tu propio servidor - Ghost Docs
meta_description: Todo lo que necesitas para tener la plataforma de blogging Ghost corriendo en tu entorno local o remoto.
heading: Instalando Ghost &amp; Empezando
subheading: Los primeros pasos para poner a punto tu nuevo blog por primera vez.
permalink: /es/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Instalando en Linux <a id="install-linux"></a>

### Instalar Node

*   Puedes bajarte el `.tar.gz` de [http://nodejs.org](http://nodejs.org), o quizás prefieras seguir las instrucciones para [instalarlo desde un gestor de paquetes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Comprueba que tienes Node y npm instalados escribiendo `node -v` and `npm -v` en tu terminal

### Instalar y levantar Ghost

*   Haz login en [http://ghost.org](http://ghost.org) y haz click sobre el botón azul 'Descargar Ghost'
*   Ya en la página de descargas, bájate el último zip y extraelo en la ruta desde la que quieras correr Ghost
*   En tu terminal, muévete al directorio donde extrajiste el código de Ghost
*   En tu terminal, escribe `npm install --production` <span class="note">ojo con los 2 guiones</span>
*   Una vez que npm ya está instalado, escribe `npm start` para arrancar Ghost en modo desarrollo
*   En un navegador, ve a <code class="path">127.0.0.1:2368</code> para ver tu recién estrenado Ghost blog
*   Cambia la url apuntando a <code class="path">127.0.0.1:2368/ghost</code> para crear tu usuario admin y hacer login en el admin de Ghost

Si estás utilizando Linux en un entorno virtual o a través de SSH, y sólo dispones de terminal, entonces:

*   Utiliza tu sistema operativo para encontrar la URL del zip de Ghost(cambia con cada versión), y salva la url pero cambia '/zip/' port '/archives/'
*   In the terminal use `wget url-of-ghost.zip` to download Ghost
*   Descomprimer el archivo con `unzip -uo Ghost-#.#.#.zip -d ghost`, y entonces `cd ghost`
*   Escribe `npm install --production` para instalar Ghost <span class="note">ojo con los 2 guiones</span>
*   Una vez que npm ya está instalado, escribe `npm start` para arrancar Ghost en modo desarrollo
*   Ghost ya estará corriendo en localhost
