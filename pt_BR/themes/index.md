---
lang: pt_BR
layout: themes
meta_title: Fazendo temas para o Ghost - Ghost Docs
meta_description: Um guia aprofundado para fazer temas para a plataforma de blog Ghost. Tudo o que você precisa saber para construir temas para Ghost.
heading: Temas do Ghost
subheading: Comece a criar seus próprios temas para o Ghost
chapter: themes
---

{% raw %}

## Mudando de Tema <a id="switching-theme"></a>

Os temas para o Ghost estão em <code class="path">content/themes/</code>

Se você quer usar um tema diferente do padrão Casper, dê uma olhada nos nossos temas personalizados na nosso [marketplace gallery](http://marketplace.ghost.org/). Baixe o tema de sua escolha, extraia ele e coloque em <code class="path">content/themes</code> ao lado do Casper.

Se você quer fazer seu próprio, nós recomendamos copiar e renomear o diretório casper e editar os templates para parecerem e funcionarem da maneira que você quer.

Para mudar para seu mais novo tema:

1.  Reinicie o Ghost. Nesse momento o Ghost não sabe que você colocou uma nova pasta dentro de <code class="path">content/themes</code> então precisamos reiniciar ele
2.  Entre na parte de administração do Ghost e navegue para <code class="path">/ghost/settings/general/</code>
3.  Selecione o nome do tema nas opções 'Theme', no menu dropdown
4.  Clique em 'Salvar'
5.  Visite seu blog e maravilhe-se com seu novo tema.

<p class="note">** Nota: ** Se você está no com um serviço de hospedagem do Ghost, ao invés de uma auto-instalação, para mudar o tema que você precisa ir para a <a href="https://ghost.org/blogs/">adminsitração do seu blog</a> e clique em "Editar" ao lado do nome do seu blog.</p>

##  O que são Handlebars? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) é a linguagem de templates usada pelo Ghost.

> A handlebars fornece os poderes necessários para criar templates semânticos efetivamente e sem frustrações.

Se você está querendo começar a escrever seu próprio tema, você porovavelmente irá querer se familiarizar com a sintaxe do Handlebars primeiro. Dê uma lida na [documentação do handlebars](http://handlebarsjs.com/expressions.html), ou veja esse [tutorial do Treehouse](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) – você pode pular a primeira seção da instalação e uso (nós fizemos essa parte para você) e focar na parte de ‘Basic Expressions’.

Ghost também faz uso de uma biblioteca adicional chamada `express-hbs`, que acrescenta algumas [novas funcionalidades](https://github.com/barc/express-hbs#syntax) ao handlebars e o Ghost acaba se utilizando muito de, como por exemplo, as funcionalidades de [layouts](#default-layout) e [partials](#partials).

## Sobre os Temas do Ghost <a id="about"></a>

Temas do Ghost são para ser simples de construir e manter. Eles se guiam por uma grande separação entre os templates (o HTML) e qualquer arquivo de lógica (JavaScript). A handlebars são (quase) sem lógica e reforça essa separação, fornecendo o mecanismo auxiliar para que a lógica para a exibição de conteúdo permaneça separada e independente. Esta separação é necessária para facilitar a colaboração entre designers e desenvolvedores na construção de temas.

Templates Handlebars são hierárquicos (um template pode extender outro template) e também suporta templates parciais. O Ghost usa essas funções para reduzir a duplicação de código e manter os templates individuais focados em fazer um único trabalho, e fazer isso bem. Uma boa estrutura de tema se torna fácil de atualizar, e manter esses componentes separados faz ser muito mais fácil reutilizar esses arquivos pelos temas.

Nós realmente esperamos que você vai desfrutar de nossa abordagem para fazer temas.

## A Estrutura de Arquivos dos Temas do Ghost <a id="file-structure"></a>

A estrutura recomendada é essa:

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [obrigatório]
└── post.hbs [obrigatório]
```

Por enquanto não há nenhuma exigência de que <code class="path"> default.hbs </code> ou quaisquer outra pasta exista. É recomendado que você mantenha os seus assets dentro de uma pasta chamada <code class="path"> asset</code> e fazer uso da [`{{asset}}` helper] (#asset-helper) para conter os seus css, js, imagem, fonte e outros arquivos para o seu tema.

<code class="path">index.hbs</code> e <code class="path">post.hbs</code> são obrigatórios - Ghost não vai funcionar se estes dois arquivos não estiverem presentes.

*Nota:* enquanto edita, um arquivo existente, as modificações são geradas em tempo real, mas você terá que reiniciar o Ghost cada vez que você adicionar ou remover um arquivo a partir do diretório do tema para que possa ser reconhecido e utilizado.

### Partials <a id="partials"></a>

Você também pode adicionar, opcionalmente, um <code class="path">partials</code> do diretório de seu tema. Isto deve incluir todos os templates que deseja usar no seu blog, por exemplo <code class="path">list-post.hbs</code> pode incluir o seu template para a mostrar um único post em uma lista, que pode então ser usada na página inicial, e, no futuro, de arquivamento. Para emitir o <code class="path">list-post.hbs</code> por exemplo, você usaria `{{> list-post}}`. <code class="path">partials</code> é também onde você pode colocar modelos para substituir os modelos integrados utilizados por certos helpers como paginação. Incluindo o arquivo <code class="path">pagination.hbs</code> dentro da <code class="path">partials</code> permitirá que você especificar seu próprio HTML para a paginação.

### default.hbs <a id="default-layout"></a>

Esse é o layout padrão, ou template base, que contém todas as partes chatas de HTML que têm de aparecer em todas as páginas - o `<html>`, `<head>` e `<body>` tags que estão junto com o `{{ghost_head}}` e `{{ghost_foot}}` helpers, assim como qualquer código HTML que compõe um cabeçalho e rodapé repetido para o blog.

O template padrão contém a handlebars `{{{body}}}` para indicar onde o conteúdo vai estar partir de templates que estendem o templates padrão.

Os templates para as páginas que tem `{{!< default}}`na primeira linha para especificar que eles estendem o template padrão, e que o seu conteúdo deve ser colocado no lugar onde default.hbs `{{{body}}} `está definida.

### index.hbs

Este é o template para a página inicial, e se estende <code class="path">default.hbs</code>. Para a página inicial é passada uma lista de artigos que devem ser exibidos, e <code class="path">index.hbs</code> define como cada um dos artigos devem ser exibidos.

No Casper (o tema padrão atual), a página inicial tem um grande cabeçalho que usa `@blog` como configurações globais para a saída do logotipo, título e descrição do blog. Isto é seguido por um usando o helper `{{#foreach}}` para produzir uma lista dos posts mais recentes.

### post.hbs

Este é o template para um único post, que também se estende <code class="path"> default.hbs </code>. 

No Casper (o tema padrão atual), o modelo único post tem a sua própria header, utilizando também `@blog` como configurações globais e, em seguida, usa o assessor de dados `{{#post}}` para a saída de todos os detalhes dos posts.

### page.hbs

Você pode, opcionalmente, fornecer um template para páginas estáticas. Se o tema não tem um template <code class="path">page.hbs</code>, o Ghost usará o padrão <code class="path">post.hbs</code>. 

As páginas têm exatamente os mesmos dados disponíveis como um post, elas simplesmente não aparecem na lista de posts.

### error.hbs

Você pode, opcionalmente, fornecer um template de erro para qualquer erro 404 ou 500. Se o tema não fornece um template <code class="path"> error.hbs </code> o Ghost usará seu padrão. 

Para ver como acessar os dados sobre um erro, de uma olhada no template de erro padrão do Ghost, que está localizado em <code class="path">/core/server/views/user-error.hbs</code>

### Estilização de posts & visualização

Ao construir temas para o Ghost por favor, considere o escopo de suas classes, e em particular os seus IDs, para tentar evitar confrontos entre o seu estilo principal e o estilo dos seus posts. Você nunca sabe quando um nome de classe ou em particular um ID (por causa da auto-geração de IDs para títulos) vai ser usado dentro de um post. Por isso é melhor sempre coisas de escopo para uma determinada parte da página. Por exemplo #meu-id poderia igualar as coisas que você não espera enquanto #meuthema-meu-id seria mais seguro.

Ghost tem como objetivo oferecer uma pré-visualização realista de suas mensagens com o seu editor de tela dividida, mas para isso, é preciso carregar um estilo personalizado de um tema para um post no site de administração. Este recurso ainda não foi implementado, mas é altamente recomendável manter seus estilos de posts em um arquivo separado (post.css) a partir de outros estilos para o seu tema (style.css) de modo que você vai rapidamente ser capaz de tirar proveito desse recurso na futuro.

## Criando o seu próprio tema <a id="create-your-own"></a>

Crie seu próprio tema para o Ghost copiando Casper, ou adicionando uma nova pasta com o conteúdo no diretório <code class="path">content/themes</code> com o nome de seu tema, como por exemplo meu-tema (nomes devem estar em letras minúsculas, e conter apenas letras, números e hífens). Em seguida, adicione dois arquivos vazios para sua nova pasta tema: index.hbs e post.hbs. Ele não vai mostrar nada, mas isso é efetivamente um tema válido.

### A lista de posts

<code class="path">index.hbs</code> entregou um objeto chamado `posts`, que pode ser usado com o helper foreach para a saída de cada post. Por exemplo

```
{{#foreach posts}}
// Aqui estamos no contexto de um único post 
// O que você colocar aqui é executado para cada posts
{{/foreach}}
```

Veja a seção sobre o helper [`{{#foreach}}`](#foreach-helper) para mais detalhes.

#### Paginação

Veja a seção sobre o helper [`{{pagination}}`](#pagination-helper) para mais detalhes.

### Produzir mensagens individuais

Uma vez que você está no contexto de um único post, seja por loop através da lista de postagens com `foreach` ou dentro de <code class="path">post.hbs</code> você tem acesso às propriedades de um post. 

Por enquanto, estes são:

*   id – *post id*
*   title – *título do post*
*   url – *a URL relativa para de um post*
*   content – *HTML do post*
*   published_at – *Data que o post foi publicado*
*   author – *detalhes completos do autor do post* (veja abaixo para mais detalhes)

Each of these properties can be output using the standard handlebars expression, e.g. `{{title}}`.

Cada uma destas propriedades pode ser produzido usando a handlebars padrão, por exemplo, `{{title}}`.

<div class="note">
  <p>
    <strong>Notas:</strong> <ul>
      <li>
        the content property is overridden and output by the <code>{{content}}</code> helper which ensures the HTML is output safely & correctly. See the section on the <a href="#content-helper"><code>{{content}}</code> helper</a> for more info.

        a propriedade de conteúdo é substituído pelo helper <code>{{content}}</code>  que garante o HTML saia com segurança e corretamente. Veja a seção sobre o <a href="#content-helper">helper <code>{{content}}</code></a> para mais informações.
      </li>
      <li>
        a propriedade url é fornecida pelo helper <code>{{url}}</code>  Veja a seção sobre o <a href="#url-helper">helper <code>{{url}}</code></a> para mais informações.
      </li>
    </ul>
  </p>
</div>

#### Autor do post

Quando esta dentro do contexto de um único post, os seguintes dados do autor estão disponíveis:

*   `{{author.name}}` – the name of the author
*   `{{author.email}}` – the author's email address
*   `{{author.bio}}` – the author's bio
*   `{{author.website}}` – the author's website
*   `{{author.image}}` – the author's profile image
*   `{{author.cover}}` – the author's cover image

Você pode usar apenas `{{author}}` para ter o nome do autor.

Isto também pode ser feito por meio de um bloco de expressão:

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### Tags do Post

Quando dentro do contexto de um único post, os seguintes dados de tag estão disponíveis

*   `{{tag.name}}` –nome da tag

Você pode usar apenas `{{tags}}` para ter uma lista personalizada de tags, isso também pode ser feito usando uma expressão de bloco:

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

Veja a seção sobre o helper de [`{{tags}}`](#tags-helper) para mais detalhes das opções.

### Configurações Globais

Temas para o Ghost têm acesso a uma série de configurações globais através do assessor de dados global `@Blog`.

*   `{{@blog.url}}` – a url especifica para esta env esta em <code class="path">config.js</code>
*   `{{@blog.title}}` – o título do blog na página de configurações
*   `{{@blog.description}}` – a descrição do blog a partir da página de configurações
*   `{{@blog.logo}}` – o logotipo do blog retirado da página de configurações

## Built-in Helpers <a id="helpers"></a>

O Ghost tem diversos Helpers que lhe dão as ferramentas que você precisa para construir o seu tema. Helpers são classificados em dois tipos: block e output helpers

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** tem uma marca de início e fim Exemplo: `{{#foreach}}{{/foreach}}`. O contexto entre as tags muda e esses helpers também podem fornecer propriedades adicionais que você pode acessar com o símbolo '@'.

**Output Helpers** são muito parecidos com as expressões utilizadas para saída de dados, por exemplo `{{content}}`. Eles realizam operações úteis sobre os dados antes de gerá-lo, e muitas vezes lhe proporcionam opções de como formatar os dados. Alguns output helpers usam modelos para formatar os dados com HTML. Alguns output helpers também são block helpers, fornecendo uma variação da sua funcionalidade.

----

### <code>foreach</code> <a id="foreach-helper"></a>

*   Tipo de Helper: block
*   Opicionais: `columns` (número)

`{{#foreach}}` é um helper de loop especial projetado para trabalhar com listas de posts. Por padrão, cada helper no handlebars adiciona as propriedades privadas `@index` como arrays e `@key` como objetos, que pode ser usado dentro da cada loop. 

`foreach` estende e adiciona as propriedades privadas adicionais de `@first`, `@last`, `@even`, `@odd`, `@rowStart` e `@rowEnd` para arrays e objetos. Isso pode ser usado para produzir layouts mais complexos para as listas de post e outros conteúdos. Para exemplos, veja abaixo:

#### `@first` & `@last`

O exemplo a seguir verifica através de um array ou objeto por exemplo, `posts` e testa se é a primeira entrada.

```
{{#foreach posts}}
    {{#if @first}}
        <div>Primeiro post</div>
    {{/if}}
{{/foreach}}
```

We can also nest `if` statements to check multiple properties. In this example we are able to output the first and last post separately to other posts.

Podemos também aninhar declarações de `if` para verificar várias propriedades. Neste exemplo, é possivel mostrar o primeiro e último post separado para outros lugares.

```
{{#foreach posts}}
    {{#if @first}}
    <div>Primeiro post</div>
    {{else}}
        {{#if @last}}
            <div>Último post</div>
        {{else}}
            <div>Todos os outros posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

O exemplo a seguir adiciona uma classe de par ou ímpar, o que poderia ser utilizada para o conteúdo de listras de zebra:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

The following example shows you how to pass in a column argument so that you can set properties for the first and last element in a row. This allows for outputting content in a grid layout.

O exemplo a seguir mostra como passar um argumento de coluna, de modo que você pode definir propriedades para o primeiro e último elemento em uma linha. Isto permite a saída de conteúdo em um layout em grid.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}Primeiro{{/if}}{{#if @rowEnd}}Último{{/if}}">{{title}}</li>
{{/foreach}}
```

----

### <code>content</code> <a id="content-helper"></a>

*   Tipo de Helper: output
*   Opicionais: `words` (número), `characters` (número) [por padão mostra todos]

`{{content}}` é um helper muito simples de ser usado para a saída de conteúdo do post. Ele garante que o seu HTML recebe saída corretamente. 

Você pode limitar a quantidade de conteúdo HTML de saída, passando um dos opcionais:

`{{content words="100"}}` produzirá apenas 100 palavras com as tags HTML corretamente combinados.

----

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Tipo de Helper: output
*   Opicionais: `words` (`número), `characters` (`número) [por padão mostra 50 palavras]

`{{excerpt}}` saídas de conteúdo, porém retira todas as tags HTML. Isto é bem útil para a criação de trechos de posts. 

Você pode limitar a quantidade de texto para a saída, passando uma das opções:

`{{excerpt characters="140"}}` produzirá 140 caracteres de texto.

----

### <code>tags</code> <a id="tags-helper"></a>

*   Tipo de Helper: output
*   Opicionais: `separator` (string, default ", "), `suffix` (string), `prefix` (string)

`{{tags}}` é um auxiliar para a saída de uma lista de tags para um post específico. O padrão é uma lista separada por vírgula:

```
// a saida é algo como 'minha-tag, minha-outra-tag, mais-tags'
{{tags}}
```

 mas você pode personalizar o separador entre tags:

```
// a saida é algo como 'minha-tag | minha-outra-tag | mais tags'
{{tags separator=" | "}}
```

Além de passar um prefixo ou sufixo opcional.

```
// a saida é algo como 'Tagueado como: minha-tag | minha-outra-tag | mais tags'
{{tags separator=" | " prefix="Tagueado como:"}}
```

----

### <code>date</code> <a id="date-helper"></a>

*   Tipo de Helper: output
*   Opicionais: `format` (formato de data, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` é um auxiliar de formatação para datas em vários formatos. Você pode passar uma data e uma string para formatar uma data:

```
// a saida é algo como 'Julho 11, 2014'
{{date published_at format="MMMM DD, YYYY"}}
```

Ou você pode passar uma flag para obter horas atrás:

```
// a saida é algo como '5 minutos atrás'
{{date published_at timeago="true"}}
```

Se você chamar `{{date}}` sem nenhum formato, o padrão é “MMM Do, YYYY”.

Se você chamar `{{date}}` no contexto de um post sem dizer quais data para exibir, o padrão será `publicado em`.

Se você chamar `{{date}}` fora do contexto de um post sem dizer quais data para exibir, o padrão será a data atual.

`date` use [moment.js](http://momentjs.com/) para formatar a data. Veja a [documentação](http://momentjs.com/docs/#/parsing/string-format/) para uma explicação completa para todas as formas possíveis de formatação de data.

----

### <code>encode</code> <a id="encode-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{encode}}` 
é um output helper simples, que vai codificar uma string, de modo que ele possa ser utilizada em uma URL.

O exemplo mais óbvio de onde isso é útil é mostrado na Casper's <code class="path">post.hbs</code>, para um link de compartilhamento do twitter

```
<a class="icon-twitter" href="http://twitter.com/share?text={{encode title}}&url={{url absolute="true"}}"
    onclick="window.open(this.href, 'twitter-share', 'width=550,height=235');return false;">
    <span class="hidden">Twitter</span>
</a>
```

Sem usar o helper `{{encode}}` no titulo do post, os espaços outros sinais de pontuação no título não seriam tratado corretamente.

----

### <code>url</code> <a id="url-helper"></a>

*   Tipo de Helper: output
*   Opicionais: `absolute`

`{{url}}` gera a url relativa para o post quando esta dentro do contexto de um post.

Você pode forçar o url helper para a saída de uma URL absoluta usando o opicional absolute, por exemplo: `{{url absolute="true"}}`

----

### <code>asset</code> <a id="asset-helper"></a>

* Tipo de Helper: output
* Opicionais: nenhum

O `{{asset}}` existe para facilitar a gestão dos assets. Em primeiro lugar, ele garante que o caminho relativo para um asset é sempre correto, independentemente de como Ghost está instalado. Então, se o Ghost está instalado em um subdiretório, os caminhos para os arquivos ainda estaram corretos, sem ter que usar URLs absolutas.


Em segundo lugar, ele permite que os assets a serem armazenadas em cache. Todos os assets são acessados com `?v=#######` que muda quando o Ghost é reiniciado e garante que os assets podem ser cachiados quando necessário.

Em terceiro lugar, proporciona estabilidade para desenvolvedores de tema para que, como a manipulação dos asset do Ghost e a sua gestão madura, os desenvolvedores de tema não precisam fazer mais ajustes para os seus temas, quanto eles utilizam o asset helper.

Finalmente, isso impõe um pouco de estrutura em temas, exigindo uma pasta de <code class="path">assets</code>, o que significa que o Ghost saberá onde seus assets, e o tema de instalação estão, desta maneira torna mais fácil o live reloading no futuro.

#### Uso

Para usar o `{{asset}}` helper para a obter o caminho de um asset, simplesmente fornecer-lhe o caminho para o recurso que você deseja carregar, com relação a pasta de <code class="path">asset</code>.

```
// a saida é algo como: <link rel="stylesheet" type="text/css" href="/path/to/blog/assets/css/style.css?v=1234567" />
<link rel="stylesheet" type="text/css" href="{{asset "css/style.css"}}" />
```

```
// a saida é algo como: <script type="text/javascript" src="/path/to/blog/assets/js/index.js?v=1234567"></script>
<script type="text/javascript" src="{{asset "js/index.js"}}"></script>
```

#### Favicons

Favicons são uma ligeira exceção à regra de como usar o asset helper, porque o navegador sempre pede um favicon, independentemente do tema, e Ghost tem como objetivo atender a esse pedido o mais rápido possível. 

Por padrão `{{asset "favicon.ico"}}` funciona exatamente da mesma maneira como é pedido pelo navegador, servindo o favicon padrão do Ghost a partir da pasta compartilhada. 
Isso significa que o navegador não tem que procurar o tema que o blog esta usando ou onde o tema está antes de do navegador requisitar.

Se você preferir usar um favicon personalizado, você pode fazê-lo, colocando um <code class="path">favicon.ico</code> na pasta de asset do seu tema e usando o asset helper com uma barra inicial:

`{{asset "/favicon.ico"}}`

This trailing slash tells Ghost not to serve the default favicon, but to serve it from the themes asset folder.
Esta barra no final diz ao Ghost para não para mostrar o favicon padrão, mas para mostrar o faviocon da pasta de asset do tema.

----

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Tipo de Helper: output, template-driven
*   Opicionais: nenhum (em breve)

`{{pagination}}` é um helper dirigido ao template que gera um HTML para os 'posts' mais recentes e links dos posts mais velhos "se eles estão disponíveis, também diz que a página que você está.

Você pode substituir o HTML gerado pelo pagination helper, colocando um arquivo chamado <code class="path">pagination.hbs</code> dentro de <code class="path">content/themes/your-theme/partials</code>.

----

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{body_class}}` – classes destinadas a tag `<body>` em <code class="path">default.hbs</code>, úteis para o direcionamento de estilo para páginas específicas.

----

### <code>post_class</code> <a id="postclass-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{post_class}}` – classes destinadas ao connteiner de post, útil para setar seus posts com estilos.

----

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{ghost_head}}` – Vem pouco antes da tag `</head>` em <code class="path">default.hbs</code>, usado colocar as meta tags, scripts e estilos. Será hookavel.

----

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{ghost_foot}}` – Vem pouco antes da tag `</body>` em <code class="path">default.hbs</code>, usado colocar scripts. Mostra o Jquery por padrão. Será hookavel.

----

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

mostra o título do post nos posts, ou caso contrário o título do blog. Usado para saída de tags de título no bloco `</head>`. Por exemplo `<title>{{meta_title}}</title>. Será hookavel.

----

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Tipo de Helper: output
*   Opicionais: nenhum

`{{meta_description}}` - não mostra nada (ainda) nos posts, gera a descrição do blog em todas as outras páginas. Usado para mostra a meta tag description. Por exemplo `<meta name="description" content="{{meta_description}}" />`. Será hookavel.

## Resolução de Problemas nos Temas <a id="troubleshooting"></a>

#### 1. Eu vejo o Erro: Falha ao achar os arquivos "index" ou "post" 

Verifique se na pasta de seu tema contém um arquivo index.hbs e post.hbs nomeados corretamente como são necessários

{% endraw %}