---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Instalando en Windows <a id="install-windows"></a>

### Instala Node

*  En [http://nodejs.org](http://nodejs.org) pulsa el botón install para descargar un archivo '.msi'
*   Haz click a 'download' para abrir el instalador, este instalará node y npm.
*   Sigue las instrucciones del instalador, hasta llegar a la pantalla que dice que Node.js está instalado.

Si tienes algún problema puedes ver el [proceso completo en acción aquí](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### Descarga y descomprime Ghost

*   Ingresa como usuario a [http://ghost.org](http://ghost.org), y haz click al botón azul que dice 'Download Ghost Source Code'.
*   En la página de descargas, pulsa el botón para descargar el archivo zip más reciente.
*   Haz click en la flecha que aparece junto al archivo, y selecciona 'Abre la carpeta contenedora'.
*   Cuando la carpeta este abierta, Haz clic derecho en el archivo zip y selecciona  'Descomprime'.

Si tienes algún problema puedes ver el [proceso completo en acción aquí](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### Instala y ejecuta Ghost

*   En el menú Inicio, busca 'Node.js' y luego selecciona 'Node.js Command Prompt' (línea de comandos de Node.js)
*   En la línea de comandos de Node cambia al directorio donde descomprimiste Ghost con: `cd Downloads/ghost-#.#.#` (reemplaza los '#' con la versión descargada de Ghost).
*   A continuación, en la línea de comandos, usa el comando `npm install --production` <span class="note">ten en cuenta los dos guiones</span>
*   Cuando npm termine de instalar, usa el comando `npm start` para iniciar Ghost en modo de desarrollo
*   En un navegador, visita <code class="path">127.0.0.1:2368</code> para ver tu nueva instalación de Ghost Blog
*   Cambia el url a <code class="path">127.0.0.1:2368/ghost</code> y crea tu usuario administrador para ingresar a tu página de administración de Ghost.
*   Mira la [Documentación sobre el uso](/usage) para los próximos pasos.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

