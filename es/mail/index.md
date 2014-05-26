---
lang: es
layout: mail
meta_title: Configuración de Correo Electrónico en Ghost - Documentación de Ghost
meta_description: Instrucciones para configurar tu servidor de correo electrónico y enviar correo en la plataforma de blog Ghost. Todo lo que necesitas saber.
heading: Configurando el Correo Electrónico
chapter: mail
---


## Configuración de Correo <a id="email-config"></a>

La siguiente documentación explica en detalle cómo configurar correo en Ghost. Ghost usa [Nodemailer](https://github.com/andris9/Nodemailer), su documentación incluye aún más ejemplos.

### Espera un momento, ¿Cómo?

Si estas familiarizado con el mundo de PHP, probablemente estas bastante acostumbrado a tener correo que funciona magicamente en tu plataforma de hosting. Node es un poco diferente, es brillante y nuevo y aún un poco tosco en algunas partes.

Pero no te preocupes, la configuración de correo electrónico es hecha solo una vez y estamos aqui para guiarte paso a paso.

### Pero... ¿Por qué?

Por el momento, Ghost usa el correo electrónico únicamente para mandarte un correo con una contraseña nueva si acaso se te olvida. No es mucho, pero no subestimes lo útil que es tener esta función si la necesitas.

En el futuro, Ghost apoyará la configuración de subscripciones a través de correo electrónico a tus blogs. El envío de detalles de cuenta para nuevos usuarios y otras funciones útiles que dependen de la posibilidad de enviar correo.

## Ok, ¿Y entonces cómo se hace? <a id="how-to"></a>

La primera cosa que necesitas es una cuenta con un servicio de correo electrónico. Nosotros recomendamos Mailgun. Tienen una cuenta inicial gratuita excelente te permite enviar más correo del que la mayoría de los servicios de subscripción más prolíficos pueden lograr. También puedes usar Gmail or Amazon SES.

Una vez que hayas decido que tipo de servicio de correo vas a usar necesitas añadir la configuración al archivo `config en Ghost. Donde tengas Ghost instalado, puedes encontrar el archivo <code class="path">config.js</code> en el directorio raíz junto con <code class="path">index.js</code>. Si aún no tienes un archivo <code class="path">config.js</code> entonces copia <code class="path">config.example.js</code> y cambia el nombre.

### Mailgun <a id="mailgun"></a>

Ve a [mailgun.com](http://www.mailgun.com/) y registra una cuenta. Necesitas una dirección de correo, y can a querer un nombre de dominio o subdominio. Esto lo puedes cambiar luego, así que por ahora puedes usar un subdominio similar al nombre de tu blog.

Verifica tu dirección de correo electrónico con Mailgun, y tendras acceso a su encantador panel de control. Tienes que buscar el nombre de usuario y contraseña creados por Mailgun para tu cuenta (no son los que usaste para registrarte) haciendo clic a tu dominio al lado derecho... puedes ver el pequeño screencast aqui abajo con ayuda para encontrar tus datos.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />   
  
Bueno, ahora que tienes todo lo que necesitas, finalmente es hora de abrir tu archivo config. Abre tu archivo <code class="path">config.js</code> en tu editor de texto favorito. Ve al tipo de configuración con la que quieres usar correo, y cambia la configuración de correo a:

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

Copia y pega tu 'Login' de Mailgun entre las comillas después de 'user' y tu 'Password' de Mailgun entre las comillas después de 'pass'. Suponiendo que la configuración de Mailgun fuera para la cuenta 'tryghosttest', así es como se viera:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

Ten cuidado con los caracteres especiales en el archivo cómo los dos puntos, comillas con llaves. Si mueves o eliminas uno de esos tendras varios errores extraños.

Puedes volver a usar tu configuración para entornos de desarrollo y producción, si usas ambos.

### Amazon SES <a id="ses"></a>

Puedes registrarte con un cuenta Amazon Simple Email Service a la dirección <http://aws.amazon.com/ses/>. Una vez que termines de registrar, recibirás una clave de acceso y un secreto.

Abre el archivo de Ghost <code class="path">config.js</code> en tu editor de texto favorito. Ve al tipo de configuración con la que quieres usar correo, y agrega las credenciales de Amazon de esta manera:

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmail <a id="gmail"></a>

Es posible usar Gmail para enviar correo desde Ghost. Si esto es lo que quieres hacer, te recomendamos [crear una cuenta nueva](https://accounts.google.com/SignUp) para esto, en lugar de usar tu cuenta personal.

Una vez que hayas creado tu cuenta, puedes configurar el archivo de configuración <code class="path">config.js</code> de Ghost. Abre el en tu editor de texto favorito. Ve al tipo de configuración con la que quieres usar correo, y cambia la configuración de correo a:

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### La dirección remitente 'From' <a id="from"></a>

Por defecto, la dirección "De" para el correo enviado desde Ghost usa la dirección de correo electrónico en tu página general de configuración. Si la quieres cambiar a algo distinto, puedes configurarlo en el archivo <code class="path">config.js</code>.

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
