---
lang: pt-BR
layout: default
meta_title: Configurar Email
meta_description: Como configurar o servidor de e-mail e enviar e-mails com o Ghost. Tudo o que você precisa saber.
heading: Configurando o Email
chapter: mail
---

## Configuração do Email <a id="email-config"></a>

A documentação a seguir detalha como configurar o e-mail no Ghost. O Ghost utiliza o [Nodemailer](https://github.com/andris9/Nodemailer), e a documentação deles contém ainda mais exemplos. 

### Espera aí, o quê?

Se você está familiar com o PHP, então você provavelmente está acostumado a ter seu e-mail magicamente funcionando em sua plataforma de hospedagem. O Node é um pouco diferente, ele é novo em folha e algumas coisas não estão tão redondas em alguns quesitos.

Mas não tenha medo, configurar seu e-mail é algo que será necessário somente uma vez e estamos aqui para te ajudar a passar por isso.

### Mas por quê?

No momento, o Ghost só utiliza o email para enviar uma mensagem com uma nova senha, caso você esqueça a sua. Não é muito, mas não subestime como isso pode ser uma função útil quando você por acaso precisar.

No futuro o Ghost também irá suportar assinaturas por e-mail para os seus blogs. Enviando um e-mail com os detalhes da conta de um novo usuário e outras pequenas funções que irão precisar que ele seja capaz de enviar um email.

## Ok, então como faço isso? <a id="how-to"></a>

A primeira coisa que você irá precisar é de uma conta em um serviço de envio de email. Nós recomendamos fortemente o Mailgun. Eles tem um ótimo plano gratuito para você começar, que vai lhe permitir enviar mais emails que qualquer blog com um serviço de assinaturas por email pode gerenciar. Você pode usar também o Gmail ou o Amazon SES.

Uma vez que você decidir qual serviço de email irá usar, você precisa adicionar as informações dele no arquivo de configuração do Ghost. Onde quer que você tenha instalado o Ghost, você deve achar um arquivo <code class="path">config.js</code> no diretório raiz junto do <code class="path">index.js</code>. Se você não tem um arquivo <code class="path">config.js</code> ainda, copie o <code class="path">config.example.js</code> e renomei-o.

### Mailgun <a id="mailgun"></a>

Entre no endereço do [mailgun.com](http://www.mailgun.com/) e registre uma conta. Você irá precisar de um endereço de e-mail à mãos, e ele irá pedir para você informar o seu domínio, e escolher um subdomínio do serviço. Você pode mudar isso depois, então por agora, por que não registrar um subdomínio parecido com o nome do blog que você está configurando.

Verifique seu endereço de e-mail com o Mailgun, e então ele irá lhe dar acesso ao seu amável painel de controle. Você precisará encontrar o seu usuário e senha do novo serviço de email que o Mailgun terá criado para você. (não são aqueles que você se registrou), clicando no seu domínio no canto direito… veja esse pequeno screencast abaixo que irá lhe ajudar a achar seus detalhes.

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />

Agora que você tem tudo que precisa, é hora de abrir seu arquivo de configuração. Abra seu arquivo <code class="path">config.js</code> no editor de sua escolha. Navegue para o ambiente que você quer configurar o email, e mude as configurações para que seja semelhante a isso:

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

Coloque seu 'Login' do mailgun entre as aspas simples depois do 'user' e seu 'Password' do mailgun entre as aspas simples que estão após 'pass'. Se você tiver configurado o mailgun para a conta 'tryhosttest', ele irá ser semelhante a isso:

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

Fique de olho nas vírgulas, aspas e chaves. Esqueça algum deles e você irá encontrar erros estranhos.

Você pode reutilizar suas configurações para ambos os ambientes, desenvolvimento e produção, caso você tenha os dois.

### Amazon SES <a id="ses"></a>

Você pode se registrar uma conta no Amazon Simple Email Service no link <http://aws.amazon.com/ses/>. Assim que você terminar de se registrar, você terá uma chave de acesso (access key) e uma chave secreta (secret).

Abra o arquivo <code class="path">config.js</code> do Ghost no seu editor de preferência. Navegue para o ambiente que você deseja configurar o email, e então adicione suas credênciais da Amazon, assim como mostrado abaixo:

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

É possível utilizar o Gmail para enviar emails pelo Ghost. Se você for fazer isso, nós recomendamos que você [crie uma conta](https://accounts.google.com/SignUp) com esse propósito, ao invés de utilizar os dados do seu e-mail pessoal.

Uma vez que você tenha criado sua nova conta, você pode configurar as preferências do Ghost no arquivo <code class="path">config.js</code>. Abra o arquivo no editor de sua preferência. Navegue para o ambiente que você quer configurar o email, e mude as configurações para que sejam semelhantes as à seguir:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Gmail',
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### Endereço do Remetente <a id="from"></a>

Por padrão o remetente (from) dos e-mails enviados pelo Ghost será o endereço de email que está na página de configurações gerais. Se você quer sobreescrever para algo diferente, você também pode configurar isso no arquivo <code class="path">config.js</code>.

```
mail: {
    fromaddress: 'myemail@address.com',
}
