---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Instalando en Mac <a id="install-mac"></a>

Para instalar Node.js y Ghost en tu Mac necesitas abrir un terminal. Puedes hacer esto abriendo el spotlight (haz click a la lupa en la zona superior a la derecha de la pantalla) y escribe en el campo que aparece “Terminal”.

### Instala Node

*   En [http://nodejs.org](http://nodejs.org) pulsa el botón ‘install’ para descargar un archivo '.pkg'
*   Haz click a 'download' para abrir el instalador, este instalará node y npm.
*   Sigue las instrucciones del instalador, finalmente escribiendo tu contraseña y haz click a 'install software'.
*   Cuando el instalador haya terminado, ve a tu terminal abierto y usa el comando `echo $PATH` y verifica que '/usr/local/bin/' es tu camino.

<p class="note"><strong>Nota:</strong> Si '/usr/local/bin' no aparece en tu $PATH, ve la <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">guía de solución de problemas</a> para ver como añadirlo.</p>

Si tienes algún problema puedes ver el [proceso completo en acción aquí](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Instala y ejecuta Ghost

*   Ingresa como usuario a [http://ghost.org](http://ghost.org), y haz click al botón azul que dice 'Download Ghost Source Code'.
*   En la página de descargas, pulsa el botón para descargar el archivo zip más reciente.
*   Haz click en la flecha que aparece junto al archivo, y selecciona 'Mostrar en el Finder'.
*   En finder, abre el archivo zip para descomprimirlo.
*   A continuación, mueve la carpeta 'ghost-#.#.#' que acabas de descomprimir a la barra de pestañas del terminal abierto, esto abrirá una pestaña terminal en la ubicación correcta.
*   En esta pestaña, usa el comando `npm install --production` <span class="note">ten en cuenta los dos guiones</span>
*   Cuando npm termine de instalar, usa el comando `npm start` para iniciar Ghost en modo de desarrollo
*   En un navegador, visita <code class="path">127.0.0.1:2368</code> para ver tu nueva instalación de Ghost Blog
*   Cambia el url a <code class="path">127.0.0.1:2368/ghost</code> y crea tu usuario administrador para ingresar a tu página de administración de Ghost.
*   Mira la [Documentación sobre el uso](/usage) para los próximos pasos.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

