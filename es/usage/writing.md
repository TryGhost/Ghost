---
lang: es
layout: usage
meta_title: Cómo usar Ghost - Documentación de Ghost
meta_description: Una guía detallada sobre el uso de la plataforma de blog Ghost. Ya tienes Ghost pero no sabes bien cómo empezar? Aprende aquí!
heading: Usando Ghost
subheading: Encontrando y configurando funciones a tu manera
chapter: usage
section: writing
permalink: /es/usage/writing/
prev_section: managing
next_section: faq
---

##  Escribir posts <a id="writing"></a>

Los posts en el blog Ghost se escriben usando Markdown. Markdown es una sintaxis mínima para el marcado de documentos con formato usando signos de puntuación y caracteres especiales. Su sintaxis fue diseñada para evitar la interrupción del flujo de escritura, ayudando a concentrarte en tu contenido en lugar de las apariencias.

###  Guía de Markdown <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/) es un lenguaje de marcado diseñado para mejorar la eficiencia al escribir, manteniendo la facilidad de lectura al máximo.

Ghost usa todos los atajos estándar de Markdown y además usa algunos estilos nuestros. A continuación, la lista completa de atajos disponibles.

####  Encabezamientos

Los encabezamientos se producen colocando un número de almohadillas '#' antes del texto. El número de almohadillas '#' antes del texto determina el nivel de encabezamiento. Los niveles de encabezamiento son de 1-6.

*   H1 : `# Header 1`
*   H2 : `## Header 2`
*   H3 : `### Header 3`
*   H4 : `#### Header 4`
*   H5 : `##### Header 5`
*   H6 : `###### Header 6`

####  Formato de Texto

*   Enlaces : `[Title](URL)`
*   Negrita : `**Bold**`
*   Cursiva : `*Italic*`
*   Párrafos : Line space inbetween paragraphs
*   Listas : `* An asterix on every new list item`
*   Citas : `> Quote`
*   Código : `` `code` ``
*   HR : `==========`

####  Imágenes

Para insertar una imagen en tu post, debes usar primero `![]()` en el editor de Markdown.
Esto debería abrir una caja para subir imágenes en tu panel de vista preliminar.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

Ahora puedes arrastrar y soltar cualquier imagen (.png, .gif, .jpg) desde tu escritorio a la caja para subir imágenes para incluirla en tu post, o alternativamente, haz click a la caja para subir imágenes para usar el sistema estándar para subir imágenes.
Si prefieres incluir la dirección URL de la imagen, haz click al icono 'link' en la parte inferior a la izquierda de la caja, abriendo un campo para la dirección URL.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

Para asignar un título a la imagen sólo tienes que escribirlo entre corchetes `![Este es un título]()`. 

##### Eliminar Imágenes

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

Para eliminar una imagen, haz clic al icono 'remove', en la esquina superior derecha de la imagen actual. Esto va a abrir una caja para subir imágenes nueva.

