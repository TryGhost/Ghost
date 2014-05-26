---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Actualizando Ghost <a id="upgrade"></a>

Actualización de Ghost es super fácil. 

Hay un par de maneras que puedes usar. A continuación están los pasos necesarios seguidos por el proceso paso a paso para lograrlo estilo [point-and-click](#how-to) y también a través la [línea de comandos](#cli), así que puedas escoger el método más conveniente para ti.

<p class="note"><strong>Haz una copia de seguridad!</strong> Es importante siempre hacer una copia de seguridad (backup) antes de actualizar. Lee las <a href="#backing-up">instrucciones para backup</a> antes de hacer copia para obtener toda la información!</p>

## Resumen

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghost, una vez instalado, tiene una estructura de carpetas similar a la mostrada aqui a la izquierda. Hay dos directorios principales <code class="path">content</code> y <code class="path">core</code>, además de varios archivos en la raíz.

Actualización de Ghost es simplemente cuestión de reemplazar los archivos viejos con los nuevos, volviendo a ejecutar `npm install` para actualizar la carpeta <code class="path">node_modules</code> y reiniciar Ghost para que todo tenga efecto.

Recuerda que por defecto Ghost almacena todos tus datos personalizados, temas, imágenes, etc. en el directorio <code class="path">content</code> por lo tanto, ten mucho cuidado con esto! Reemplaza solo los archivos en <code class="path">core</code> y la raíz, y todo saldrá bien.

## Instrucciones para backup <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   Para hacer una copia de seguridad de toda la información en tu base de datos, ingresa  tu instalación de Ghost y ve a <code class="path">/ghost/debug/</code>. Pulsa el botón ‘export’ para descargar un archivo JSON con todos tus datos. Listo!
*   Para hacer una copia de seguridad de tus temas personalizados e imágenes, debes copiar todos los archivos en <code class="path">content/themes</code> y <code class="path">content/images</code>

<p class="note"><strong>Nota:</strong> Si quieres, puedes agarrar una copia de tu base de datos en <code class="path">content/data</code> pero <strong>ten cuidado</strong> ya que no debes hacer esto cuando Ghost esta en ejecución. Termina y cierra Ghost primero.</p>


## Instrucciones para actualizar <a id="how-to"></a>

Cómo actualizar en tu sistema local

<p class="warn"><strong>ADVERTENCIA:</strong> Es muy importante que <strong>NO</strong> copies y pegues la carpeta entera de Ghost encima de una instalación existente en mac. <strong>NO</strong> uses <kbd>REEMPLAZAR</kbd> si subes con Transmit u otro programa de FTP, usa <strong>MERGE</strong>.</p>

*   Descarga la versión más reciente de Ghost desde [Ghost.org](http://ghost.org/download/)
*   Descomprime el archivo zip a una ubicación temporal.
*   Copia todos los archivos que se encuentran en la raíz de la última versión. Estos incluyen: index.js, package.json, Gruntfile.js, config.example.js, license y readme.
*   A continuación, elimina el directorio <code class="path">core</code> completamente, y pon el directorio <code class="path">core</code> nuevo en su lugar.
*   Para versiones que incluyen actualización de Casper (el tema estándar), reemplaza el directorio <code class="path">content/themes/casper</code> viejo con el nuevo.
*   Ejecuta `npm install --production`
*   Finalmente, reinicia Ghost para que los cambios tengan efecto.

## Usando únicamente Línea de Comandos <a id="cli"></a>

<p class="note"><strong>Haz una copia de seguridad!</strong> Es importante siempre hacer una copia de seguridad backup antes de actualizar. Lee las <a href="#backing-up">instrucciones para backup</a> antes de hacer copia para obtener toda la información!</p>

### Línea de comandos en mac <a id="cli-mac"></a>

El screencast aqui abajo muestra los pasos para actualizar Ghost en los cuales se ha descargado el archivo zip a <code class="path">~/Downloads</code> y Ghost es instalado en <code class="path">~/ghost</code> <span class="note">**Nota:** `~` significa el directorio  home del usuario en mac y linux</span>

![Actualizando Ghost](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

Los pasos en el screencast son:

*   <code class="path">cd ~/Downloads</code> - cambia al directorio Downloads donde se encuentra la versión mas reciente de Ghost que fue descargada.
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - Descomprime Ghost el la carpeta <code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - cambia al directorio <code class="path">ghost-0.4.0</code> 
*   `ls` - muestra todos los archivos y carpetas en este directorio
*   `cp *.js *.json *.md LICENSE ~/ghost` - copia todos los archivos .md .js .txt y .json en esta ubicación a <code class="path">~/ghost</code>
*   `rm -rf ~/ghost/core` - elimina el directorio <code class="path">core</code> viejo
*   `cp -R core ~/ghost` - copia el directorio <code class="path">core</code> y todo su contenido a <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - copia el directorio <code class="path">casper</code> y todo su contenido a <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - cambia al directorio <code class="path">~/ghost</code> 
*   `npm install --production` - instala Ghost
*   `npm start` - inicia Ghost

### Línea de comandos en servidores linux <a id="cli-server"></a>

*   Primero, necesitas averiguar la dirección URL de la última versión de Ghost. Debería ser algo parecido a `http://ghost.org/zip/ghost-latest.zip`.
*   Descarga el archivo zip con `wget http://ghost.org/zip/ghost-latest.zip` (reemplaza la dirección URL con la más reciente, si es necesario).
*   Elimina el directorio `core` viejo de tu instalación
*   Descomprime el archivo con `unzip -uo ghost-0.4.*.zip -d path-to-your-ghost-install`
*   Ejecuta `npm install --production` para obtener nuevas dependencias
*   Finalmente, reinicia Ghost para que los cambios tengan efecto

**Adicionalmente**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) tiene también instrucciones para actualizar Ghost en servidores Linux.

### Actualizando un Droplet de DigitalOcean <a id="digitalocean"></a>

<p class="note"><strong>Haz una copia de seguridad!</strong> Es importante siempre hacer una copia de seguridad backup antes de actualizar. Lee las <a href="#backing-up">instrucciones para backup</a> antes de hacer copia para obtener toda la información!</p>

*   Primero, necesitas averiguar la dirección URL de la última versión de Ghost. Debería ser algo parecido a `http://ghost.org/zip/ghost-latest.zip`.
*   Una vez que tengas la dirección URL de la última versión, en tu consola Droplet usa el comando `cd /var/www/` para cambiar al directorio donde se encuentra la codebase de Ghost codebase lives.
*   Descarga el archivo zip con `wget http://ghost.org/zip/ghost-latest.zip` (reemplaza la dirección URL con la más reciente, si es necesario).
*   Elimina el directorio `core` viejo, `rm -rf ghost/core`
*   Descomprime el archivo con `unzip -uo ghost-latest.zip -d ghost`
*   Asegúrate que todos los archivos tengan los permisos adecuados con `chown -R ghost:ghost ghost/*`
*   Cambia al directorio <code class="path">ghost</code> con `cd ghost`
*   Ejecuta `npm install --production` para obtener nuevas dependencias
*   Finalmente, reinicia Ghost para que los cambios tengan efecto `service ghost restart` (esto se puede tardar un poco)


## Actualizando a la versión más reciente de Node.js <a id="upgrading-node"></a>

Si instalaste Node.js originalmente usando directamente la página web de [Node.js](nodejs.org) puede actualizar Node.js a la versión más reciente descargando y ejecutando el instalador más reciente. Esto reemplazará la versión actual con la versión nueva.

Si usas Ubuntu u otra distribución de Linux que usa  `apt-get`, el comando para actualizar Node es igual al comando para instalar: `sudo apt-get install nodejs`.

**NO** es necesario reiniciar el servidor o Ghost.
