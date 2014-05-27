---
lang: es
layout: usage
meta_title: Cómo usar Ghost - Documentación de Ghost
meta_description: Una guía detallada sobre el uso de la plataforma de blog Ghost. Ya tienes Ghost pero no sabes bien cómo empezar? Aprende aquí!
heading: Usando Ghost
subheading: Encontrando y configurando funciones a tu manera
chapter: usage
section: settings
permalink: /es/usage/settings/
prev_section: configuration
next_section: managing
---

##  Configuración de Ghost <a id="settings"></a>

Ve a <code class="path">&lt;your URL&gt;/ghost/settings/</code>.

Una vez que hayas terminado de cambiar la configuración *es necesario* pulsar el botón "Save" para guardar los cambios.

Puedes ver los cambios visitando la dirección URL del Blog.

### Configuración del Blog (<code class="path">/general/</code>)

Estas son las configuraciones específicas del Blog.

*   **Blog Title**: Cambia el título de tu blog. Referencia al tema `@blog.title`.
*   **Blog Description**: Cambia la descripción de tu blog. Referencia al tema `@blog.description`.
*   **Blog Logo**: Para subir un logo para tu blog en formato '.png', '.jpg' o '.gif'. Referencia al tema `@blog.logo`.
*   **Blog Cover**: Para subir una imagen para tu portada en formato '.png', '.jpg' o '.gif'. Referencia al tema `@blog.cover`.
*   **Email Address**: Esta es la dirección de correo electrónico para recibir avisos de administración. Es *importante* que sea una dirección de correo electrónico *válida*.
*   **Posts per page**: Esta es la cantidad de posts que se muestran por página. Debe ser un valor numérico.
*   **Theme**: Lista de todos los temas en tu directorio <code class="path">content/themes</code>. Seleccionando uno de los temas en esta lista cambiarás la apariencia de tu blog.

### Configuración de usuario (<code class="path">/user/</code>)

Éstas son las configuraciones que controlan tu perfil de usuario/autor.

*   **Your Name**: Este es el nombre para reconocerte como autor cuando publicas un post. Referencia al Tema (post) `author.name`.
*   **Cover Image**: Puedes subir una imagen para la portada de tu perfil, en formato '.png', '.jpg' o '.gif'. Referencia al Tema (post) `author.cover`.
*   **Display Picture**: Puedes subir una imagen con tu foto personal, en formato '.png', '.jpg' o '.gif'. Referencia al Tema (post) `author.image`.
*   **Email Address**: Esta será tu dirección de correo electrónico publica donde puedes también recibir notificaciones. Referencia al Tema (post) `author.email`.
*   **Location**: Esta es tu ubicación actual. Referencia al Tema (post) `author.location`.
*   **Website**: Esta es la dirección de tu página web personal o de una de tus redes sociales. Referencia al Tema (post) `author.website`.
*   **Bio**: Aquí puedes escribir una breve biografía describiéndote (máximo 200 caracteres). Referencia al Tema (post) `author.bio`.

#### Cambio de contraseña

1.  Rellena los campos con la contraseña adecuada (contraseña actual/nueva).
2.  Haz click a **Change Password**.
<p class="note">
    <strong>Nota:</strong> Para que tu contraseña cambie, es necesario hacer click al botón "Change Password", el botón "Save" no cambia la contraseña.</p>

