---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
permalink: /es/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# Guía de Solución de Problemas y Preguntas Frecuentes <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' no aparece en mi $PATH</dt>
    <dd>Puedes añadirlo así:
        <ul>
            <li>En tu terminal, usa el comando <code>cd ~</code>, esto te llevará a tu directorio `/home`</li>
            <li>Ahora usa el comando <code>ls -al</code> para mostrar todos los archivos y carpetas en este directorio, incluyendo los que son ocultos.</li>
            <li>Allí encontrarás el archivo <code class="path">.profile</code> o <code class="path">.bash_profile</code> y en caso contrario, usa el comando <code>touch .bash_profile</code> para crear uno.</li>
            <li>A continuación, usa el comando <code>open -a Textedit .bash_profile</code> para abrir el archivo con Textedit.</li>
            <li>Agrega <code>export PATH=$PATH:/usr/local/bin/</code> al final del archivo y guárdalo</li>
            <li>Esta nueva configuración será ejecutada cuando inicies un terminal nuevo, por lo tanto, abre una pestaña o ventana de terminal nueva y usa el comando <code>echo $PATH</code> para ver que '/usr/local/bin/' este presente.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 no se instala</dt>
    <dd>
        <p>El paquete SQLite3 incluye binarios pre-compilados para las arquitecturas más comunes. Si usas una distribución Linux menos popular u otros tipos de sistemas Unix, es posible que SQLite3 te de un error 404 ya que no es capaz de encontrar los binarios para tu plataforma.</p>
        <p>Esto se puede solucionar forzando SQLite3 a compilar. Para esto se necesita python y gcc. Prueba el comando <code>npm install sqlite3 --build-from-source</code></p>
        <p>En caso de error, probablemente te faltan dependencias python o gcc, en Linux prueba el comando <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> y <code>sudo apt-get install python-software-properties python g++ make</code> antes de tratar de crear desde el código fuente.</p>
        <p>Para obtener más información sobre la creación de binarios, por favor consulta: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Una vez que hayas creado con éxito un binario para tu plataforma, por favor sigue las <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">estas instrucciones</a> para enviar el binario al proyecto node-sqlite, para que los futuros usuarios no tengan el mismo problema.</p>
    </dd>
    <dt id="image-uploads">No logro subir imágenes</dt>
    <dd>
        <p>Si estás usando la configuración Droplet de DigitalOcean con la versión Ghost v0.3.2, o si usas nginx con alguna otra plataforma, es posible que no logres subir imágenes.</p>
        <p>Lo que está sucediendo realmente, es que no esta permitido subir imágenes más grandes de 1 MB (si pruebas una imagen pequeña, debería funcionar). Este es un límite bastante pequeño!</p>
        <p>Para aumentar el límite tienes que cambiar el archivo config de nginx, y establecer otro límite. </p>
        <ul>
            <li>Ingresa a tu servidor y usa el comando <code>sudo nano /etc/nginx/conf.d/default.conf</code> para abrir tu archivo config.</li>
            <li>Después de la línea <code>server_name</code>, añade lo siguiente: <code>client_max_body_size 10M;</code></li>
            <li>Finalmente, pulsa <kbd>ctrl</kbd> + <kbd>x</kbd> y cierra. Nano te preguntará si quieres guardar, escribe <kbd>y</kbd> para aceptar, y pulsa <kbd>enter</kbd> para guardar los cambios.</li>
        </ul>
    </dd>
</dl>

