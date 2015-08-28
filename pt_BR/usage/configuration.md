---
lang: pt_BR
layout: usage
meta_title: Como Usar o Ghost - Ghost Docs
meta_description: Um guia mais a fundo para usar a plataforma de blog Ghost. Escolheu o Ghost mas não sabe por onde começar? Comece aqui!
heading: Usando o Ghost
subheading: Encontrando seu caminho, e configurando do jeito que você quer
chapter: usage
section: configuration
permalink: /pt_BR/usage/configuration/
prev_section: usage
next_section: settings
---

## Configurando o Ghost <a id="configuration"></a>

Depois de executar o Ghost pela primeira vez, você vai encontrar um arquivo chamado `config.js` no diretório raiz do Ghost, juntamente com o `index.js`. Este arquivo permite que você configure variáveis do ambiente de configuração como sua URL, seu banco de dados e suas configurações de e-mail..

Se você não executou o Ghost pela primeira vez, você não vai ter esse arquivo ainda. Você pode criá-lo copiando o arquivo `config.example.js` file - é o que o Ghost faz quando é iniciado.

no seu editor preferido, e comece mudando as configurações que você deseja para o seu ambiente. Se os ambientes são algo que você não lidou ainda, leia a [documentação](#environments) abaixo.

## Configuration options

O Ghost tem uma série de opções de configuração que você pode adicionar para mudar as coisas sobre como funciona o Ghost.

### Email

Possivelmente a mais importante parte da configuração é a configuração de e-mail, o Ghost pode deixar você redefinir sua senha em caso de você esquece-lo. Leia a [documentação de e-mail]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) para mais informações.

### Database

Por padrão, o Ghost vem configurado para usar um banco de dados SQLite, que não requer configuração de sua parte. 

Se, contudo, você preferir de usar um banco de dados MySQL, você pode alterar a configuração do banco de dados. Você deve criar um banco de dados e usuário em primeiro lugar, então você pode mudar a configuração sqlite existente para algo como:

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

Você também pode limitar o número de conexões simultâneas, se desejar, usando a configuração `pool`.

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

### Server

O servidor de hospedagem e a porta são o endereço IP eo número da porta que o Ghost deve escutar as solicitações. 

Também é possível configurar o Ghost para escutar em um socket unix mudando a configuração do servidor para algo como:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### Update Check

O Ghost 0.4 introduziu um serviço para a verificação de atualização automática para que você saiba quando uma nova versão do Ghost está disponível (woo!). O Ghost.org faz coleta de dados basicos anônima para a solicitações de verificação de atualização. Para mais obter mais informações, consulte o arquivo [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) no core do Ghost.

É possível desativar as verificações de atualização e coleta de dados anônima, definindo a seguinte opção:

`updateCheck: false`

Por favor, não se esqueça de assinar os e-mails do Ghost, ou o [Blog do Ghost](http://blog.ghost.org), de modo que você ainda está informado sobre uma nova versão.

### Armazenamento de Arquivos

Algumas plataformas, como o Heroku não tem um sistema de arquivo persistente. Como resultado disso, qualquer as imagens carregadas provávelmente irão faltar em algum momento. 
É possível desativar os recursos de armazenamento de arquivos do Ghost:

`fileStorage: false`

Quando o armazenamento de arquivos está desabilitada, ferramentas de upload de imagem do Ghost irá pedir-lhe para introduzir uma URL por padrão, impedindo-o assim de upload de arquivos que serão perdidos.

## Sobre Ambientes <a id="environments"></a>

Node.js, e consequentemente o Ghost, trabalham com o conceito de criação em ambientes. Os ambientes permitem você criar diferentes configurações para modos diferentes no qual você pode querer rodar o Ghost. Por padrão, o Ghost tem dois modos de criação: **desenvolvimento** e **produção**.

Existem algumas diferenças, muito sutis, entre os dois modos ou ambientes. Essencialmente o modo de **desenvolvimento** é voltado para o desenvolvimento e particularmente a depuração do Ghost. Enquanto o modo "produção" é voltado para ser usado quando você está executando o Ghost publicamente. As diferênças incluem coisas como a maneira que o log e mensagens de erro são apresentados, e também o quanto os arquivos estáticos são concatenados e reduzidos.
No modo de **produção**, , você terá apenas um arquivo de Javascript contendo todo o código para a administração, no modo **desenvolvimento** você terá vários.

Com o avanço do Ghost, essas diferenças irão crescer e se tornar mais evidentes e, portanto, torna-se cada vez mais importante que qualquer blog público seja executado no ambiente de **produção** Isto pode levantar uma questão, por que o modo de **desenvolvimento** é o padrão, se a maioria das pessoas vão querer executar no modo de **produção**?
O Ghost tem o modo de **desenvolvimento** como padrão, pois este é o melhor ambiente para depurar problemas, provavelmente é o que você vai mais precisar quando configurar pela primeira vez.

##  Usando Ambientes <a id="using-env"></a>

Para preparar o Ghost para executar em um ambiente diferente, você precisa usar uma variável de ambiente. Por exemplo, se você iniciar normalmente o Ghost com o `node index.js` você usuaria:

`NODE_ENV=production node index.js`

Ou se você normalmente sempre usar:

`NODE_ENV=production forever start index.js`

Ou se você está acostumado a usar `npm start`, você poderia usar o jeito mais fácil para lembrar:

`npm start --production`

### Por que usar `npm install --production`?

Nós fomos perguntados algumas vezes por que, se o Ghost é iniciado em modo de desenvolvimento por padrão, a documentação de instalação diz para executar `npm install --production`? Essa é uma boa pergunta! Se você não incluir `--production` quando instalar o Ghost, nada de errado irá acontecer, mas será instalado uma grande quantidade de pacotes extras que é útil apenas para quem quer desenvolver o núcleo do Ghost.
Isso também requer que você tenha um pacote em particular, `grunt-cli` instalado globalmente, que tem que ser feito com `npm install -g grunt-cli`, é um passo extra e não é necessário se você quer apenar rodar o Ghost como um blog.