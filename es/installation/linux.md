---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Instalando en Linux <a id="install-linux"></a>

### Instala Node

*   Esto se puede hacer en dos maneras: puedes descargar el archivo `.tar.gz` desde [http://nodejs.org](http://nodejs.org), o si prefieres, puedes seguir las instrucciones sobre la [instalación con un administrador de paquetes](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Asegúrate que tengas Node y npm ya instalados con el comando `node -v` y `npm -v` en un terminal.

### Instala y Ejecuta Ghost 


**Si usas Linux en tu sistema sigue estos pasos:**

*   Ingresa como usuario a [http://ghost.org](http://ghost.org), y pulsa el botón azul 'Download Ghost Source Code'
*   En la página de descargas, pulsa el botón para descargar el archivo zip más reciente y descomprime el archivo en la ubicación donde quieres ejecutar Ghost.


**Si usas Linux como OS invitado o a través SSH y tienes solo terminal disponible, sigue estas instrucciones:**

*   Usa este comando para descargar la versión mas reciente de Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Descomprime el archivo y cambia al directorio usando el comando:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Después de descomprimir Ghost correctamente, abre un terminal, si aún no lo haz hecho, y luego:**

*   Cambia al directorio en donde descomprimiste Ghost con este comando:

    ```
    $ cd /path/to/ghost
    ```

*   Y para instalar Ghost:

    ```
    npm install --production
    ```
    <span class="note">ten en cuenta los dos guiones</span>

*   Cuando npm termine de instalar, usa este comando para iniciar Ghost en modo de desarrollo: 

    ```
    $ npm start
    ```

*   Ghost estará en ejecución en **127.0.0.1:2368**<br />
    <span class="note">Puedes cambiar la dirección de IP y puerto en **config.js**</span>

*   En un navegador, visita [http://127.0.0.1:2368](http://127.0.0.1:2368) para ver tu nueva instalación de Ghost Blog 
*   Cambia la dirección url a [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) y crea tu usuario administrador para ingresar a tu página de administración de Ghost.
