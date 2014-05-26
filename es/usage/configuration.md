---
lang: es
layout: usage
meta_title: Cómo usar Ghost - Documentación de Ghost
meta_description: Una guía detallada sobre el uso de la plataforma de blog Ghost. Ya tienes Ghost pero no sabes bien cómo empezar? Aprende aquí!
heading: Usando Ghost
subheading: Encontrando y configurando funciones a tu manera
chapter: usage
section: configuration
permalink: /es/usage/configuration/
prev_section: usage
next_section: settings
---

## Configura Ghost <a id="configuration"></a>

Después de iniciar Ghost por primera vez, encontrarás un archivo llamado `config.js` en el directorio raíz de Ghost, junto a `index.js`. Este archivo te permite ajustar la configuración del nivel de entorno para cosas como tu dirección URL, base de datos, y configuración de correo electrónico.

Si aún no haz iniciado Ghost por primera vez, entonces aún no tendrás este archivo. Puedes crear una copia del archivo `config.example.js` - Ghost hace esto automáticamente al iniciar. 

Para configurar tu dirección URL de Ghost, correo electrónico o base de datos, abre `config.js` en tu editor de texto favorito, y comienza a cambiar las configuraciones para el entorno que quieres cambiar. Si los entornos no son algo que ya conoces, lee la [documentación](#environments) a continuación.

## Opciones de configuración

Ghost tiene una serie de opciones de configuración que se pueden agregar para cambiar cómo funciona Ghost.

### Correo electrónico

Posiblemente la parte más importante de la configuración es el establecimiento de correo electrónico para que Ghost te pueda ayudar a restablecer tu contraseña si se te olvida. Lea la [documentación de correo electrónico]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) para obtener más información.

### Base de datos

Por defecto, Ghost viene configurado para utilizar una base de datos SQLite, que no requiere ninguna configuración de tu parte.

Sin embargo, si quieres usar una base de datos MySQL, puedes hacerlo cambiando la configuración de la base de datos. Debes primero crear una base de datos y usuario, y después, puedes cambiar la configuración sqlite3 existente a algo así como:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

También, si quieres, puedes limitar el número de conexiones simultáneas, utilizando la configuración `pool`.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### Servidor 

El host del servidor y el puerto son la dirección IP y número de puerto donde Ghost escucha las peticiones. 

Es posible también configurar Ghost para que en cambio escuche en un socket unix, modificando la configuración del servidor a algo así como:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### Actualizaciones al día

Ghost 0.4 introdujo un servicio de actualización automática que te avisa cuando hay una nueva versión de Ghost (qué bien!). Ghost.org recopila estadísticas anónimas de uso básico de las solicitudes de actualización. Para obtener más información, consulta el archivo [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) en el núcleo de Ghost.

Es posible desactivar el servicio de actualización automática y recopilación de estadísticas anónimas cambiando esta opción:

`updateCheck: false`

Por favor, suscribete a los correos electrónicos de Ghost, o el [Ghost blog](http://blog.ghost.org), para quedarte al día con novedades.

### Almacenamiento de archivos

Algunas plataformas como Heroku no tienen un sistema de archivos permanente. Esto resulta en la perdida a algún punto de imágenes subidas.
Puedes desactivar as funciones de almacenamiento de archivos de Ghost:

`fileStorage: false`

Cuando guarde archivos está desactivado, el applet para subir imágenes de Ghost te pedirá por defecto que ingreses una dirección URL, lo que impide subir archivos que se van a perder.

## Más sobre los entornos <a id="environments"></a>

Node.js, y Ghost por lo tanto, tienen el concepto de entornos integrado. Los entornos te permiten crear diferentes configuraciones para diferentes modos en los cuales quieras ejecutar Ghost . Por defecto, Ghost viene con dos modos integrados: **development** para el desarrollo y **production** para producción.

Hay algunas diferencias sutiles entre los dos modos (o entornos). Esencialmente **development** es especialmente adecuado para desarrollar y depurar bugs en Ghost. Por otro lado **production** es para cuando ejecutas Ghost públicamente. Las diferencias incluyen cosas cómo y que se muestra en los registros & mensajes de error, y también cuanto se concatenan y minifican los recursos estáticos. En **production**, tendrás solo un archivo JavaScript con todo el código de administración, en **development** tendrás varios.

Con futuros avances en Ghost, estas diferencias se volverán mucho más aparentes, y por lo tanto será aún más importante que todos los blogs públicos sean ejecutados en el entorno **production**. Esto quizás hace que nos preguntemos...¿Por qué entonces tener el modo **development** por defecto, si la mayoría de la gente va querer usar el entorno **production**? Ghost lleva **development** por defecto porque este es el mejor entorno para depurar bugs y problemas, algo que probablemente necesitarás más al principio.

##  Usando Entornos <a id="using-env"></a>

Para cambiar Ghost a usar otro entorno, necesitas usar una variable de entorno. Por ejemplo, si normalmente inicias Ghost con `node index.js`, entonces usarías en cambio:

`NODE_ENV=production node index.js`

O si normalmente usas forever:

`NODE_ENV=production forever start index.js`

O si estas acostumbrado a usar `npm start` puedes usar el mas recordable:

`npm start --production`

### ¿Por qué `npm install --production`?

Nos han preguntado varias veces el por qué del uso de `npm install --production` sugerido en la documentación de instalación cuando Ghost inicia en el modo development por defecto. Es una excelente pregunta! Si no incluyes `--production` cuando instalas Ghost, no va a pasar necesariamente algo malo, pero instalará una tonelada de paquetes extra que son solo útiles para aquellos que quieren desarrollar el núcleo de Ghost. Esto también requiere que tengas un paquete en particular instalado globalmente: `grunt-cli`. Esto, se tiene que hacer con `npm install -g grunt-cli`, es un paso adicional que no es necesario si quieres usar Ghost solo cómo un blog.

