---
lang: es
layout: installation
meta_title: Instalación de Ghost en tu servidor - Documentación de Ghost
meta_description: Todo lo que necesitas saber para poner en marcha la plataforma de blog Ghost para acceso local o remoto. 
heading: Instalación de Ghost &amp; Primeros Pasos
subheading: Los primeros pasos para la instalación inicial de tu nuevo blog.
chapter: installation
next_section: mac
---

## Resumen <a id="overview"></a>

La documentación de Ghost es en gran parte aún “Work in Progress”, que se actualiza y mejora periódicamente. Si tienes algún problema o alguna sugerencia para mejorarla, te agradeceremos mucho si nos lo haces saber.

Ghost es desarrollado con [Node.js](http://nodejs.org), y requiere la versión `0.10.*` (la última versión estable).

Ejecución de Ghost en tu sistema local es bastante simple, pero requiere que primero instales Node.js.

### ¿Qué es Node.js?

[Node.js](http://nodejs.org) es una plataforma moderna para crear aplicaciones web rápidas, escalables y eficientes.
    En los últimos 20 años, la web ha evolucionado de una colección de páginas estáticas a una plataforma capaz de soportar aplicaciones web complejas como Gmail y Facebook.
    JavaScript es el lenguaje de programación que ha permitido este progreso. 

[Node.js](http://nodejs.org) nos da la capacidad de escribir código JavaScript en el servidor. En el pasado, JavaScript existía solamente en el navegador, y un segundo lenguaje de programación, como PHP, era necesario para programar el lado del servidor. La posibilidad de usar y crear aplicaciones web que consisten de un solo lenguaje es una gran ventaja, y este es otro aspecto que hace Node.js accesible a los desarrolladores que normalmente se dedican sólo al lado del cliente.

[Node.js](http://nodejs.org) hace esto posible envolviendo el motor JavaScript del navegador Chrome de Google, dándole la posibilidad de instalarlo en cualquier ubicación. Esto significa que puedes instalar Ghost en tu sistema para probarlo rápido y fácilmente.
    Las siguientes secciones detallan la instalación de Ghost localmente en [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) o [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) o alternativamente, te ayudaran a instalar Ghost en tu propio [servidor o hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Primeros pasos

Si no te apetece seguir instrucciones sobre la instalación de Node.js y Ghost manualmente, la gente encantadora de [BitNami](http://bitnami.com/) han creado [instaladores Ghost](http://bitnami.com/stack/ghost) para todas las plataformas principales.

Quiero instalar Ghost en:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Si ya has decidido implementar Ghost con tu propio servidor o hosting, muy bien! La siguiente documentación te mostrará varias formas de implementar Ghost, desde configuración manual a instalaciones con un solo click.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Descargar Ghost</a>
</div>

Recuerda que Ghost es totalmente nuevo, y el equipo está trabajando duro para ofrecer funciones a un ritmo frenético. Si necesitas actualizar tu Ghost a la última versión, sigue nuestra [Guía de actualización](/installation/upgrading/).
    Si tienes algún problema, ve la [Guía de solución de problemas]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), y si no encuentras una solución, escríbenos a través del [Ghost forum](http://ghost.org/forum) donde el equipo Ghost y la comunidad están a mano para ayudarte con cualquier problema.

