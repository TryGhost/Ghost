---
lang: pt_BR
layout: usage
meta_title: Como Usar o Ghost - Ghost Docs
meta_description: Um guia mais a fundo para usar a plataforma de blog Ghost. Escolheu o Ghost mas não sabe por onde começar? Comece aqui!
heading: Usando o Ghost
subheading: Encontrando seu caminho, e configurando do jeito que você quer
chapter: usage
section: writing
permalink: /pt_BR/usage/writing/
prev_section: managing
next_section: faq
---

##  Escrevendo Artigos <a id="writing"></a>

Artigos de blog no Ghost são escritos usando Markdown. O Markdown é uma sintaxe minimalista para marcação de documentos, usando pontuação e caracteres especiais. É uma sintaxe com inteção de previnir a interrupção do fluxo de escrita, permitindo que você se foque no conteúdo, ao invés de como ele se parece.

###  Guia do Markdown <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/) é uma linguagem de marcação projetada para aumentar a eficiência em que você escreve, enquanto mantém a escrita o mais fácil de ler possível.

O Ghost usa todos os atalhos padrões do Markdown e mais alguns adicionais. A lista completa de atalhos está listada abaixo.

####   Cabeçalhos

Cabeçalhos podem ser configurados com uma tralha antes do texto. O número de hashes '#' antes do texto determina a profundidade do cabeçalho. Os cabeçalhos tem profundidades de 1-6.

*   H1 : `# Cabeçalho 1`
*   H2 : `## Cabeçalho 2`
*   H3 : `### Cabeçalho 3`
*   H4 : `#### Cabeçalho 4`
*   H5 : `##### Cabeçalho 5`
*   H6 : `###### Cabeçalho 6`

####  Estilo do Texto

*   Links : `[Título](URL)`
*   Negrito : `**Negrito**`
*   Itálico : `*Itálico*`
*   Paragráfos : Uma linha de espaço entre os paragráfos
*   Listas : `* Um asterísco em cada novo item da lista`
*   Citações : `> Citação`
*   Código : `` `codigo` ``
*   HR : `==========`

####  Imagens

Para inserir uma imagem no seu artigo, você precisa primeiro escrever `![]()` dentro do painel do editor Markdown.
Isso deve criar uma caia de envio de imagem no painel de visualização.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

Você pode agora arrastar e soltar qualquer imagem (.png, .gif, .jpg) do seu computador na caixa de envio de imagens para incluir ela no seu artigo, ou clicar na caixa de envio de imagens para abrir o envio de imagem padrão do navegador. Se você prefeir incluir o endereço de uma imagem, clique no botão 'link' no canto esquerdo inferior da caixa de envio de imagem, isso irá te dará a possibilidade de inserir a URL da imagem.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

Para colocar um título na sua imagem, tudo que você precisa fazer é colocar o texto do título entre os colchetes. exemplo; `![Isso é um título]()`. 

##### Removendo Imagens

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

Para remover uma imagem, clique no ícone 'remover', no canto superior direito da imagem que está atualmente inserida. Isso irá apresentar uma caixa de envio de imagem em branco, para você inserir uma nova imagem.