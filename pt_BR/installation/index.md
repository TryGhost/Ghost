---
lang: pt_BR
layout: installation
meta_title: Como instalar o Ghost no seu Servidor - Ghost Docs
meta_description: Tudo o que você precisa saber para colocar sua plataforma Ghost funcionando no seu ambiente local, ou em um ambiente remoto.
heading: Instalando o Ghost &amp; Começando
subheading: Os primeiros passos para configurar o seu Blog pela primeira vez.
chapter: installation
next_section: mac
---

## Resumo <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

A Documentação do Ghost ainda está em desenvolvimento, ela é atualizada e melhorada regularmente. Se você ficar preso, ou tiver alguma sugestão de melhoria, fale conosco.

Ghost é feito em [Node.js](http://nodejs.org), e requer versão  `0.10.*` (última versão estável).

Rodando Ghost local no seu computador é bastante simples, mas requer que você instale o Node.js primeiro.

### O que é Node.js??

[Node.js](http://nodejs.org) é uma moderna plataforma para desenvolvimento rápido, escalável e eficiente de aplicações Web. Nos últimos 20 anos, a Web evoluiu de uma coleção de páginas estáticas para uma plataforma capaz de suportar aplicações complexas como o Gmail e o Facebook. JavaScript é a linguagem que permitiu esse progresso.

[Node.js](http://nodejs.org) nos provê a habilidade de escrever JavaScript para o servidor. No passado, JavaScript existia somente no navegador e uma segunda linguagem, como PHP, era necessario para lidar com a programação no servidor. Ter uma aplicação Web que consiste de apenas uma linguagem é um grande beneficio e isso também torna o Node.js acessível para desenvolvedores que tradicionalmente trabalhavam no cliente-side.

A forma com que o [Node.js](http://nodejs.org) torna isso possível, é desacoplando o motor de Javascript do Google Chrome e tornando ele instalável em qualquer lugar.Isso significa que você pode instalar o Ghost em seu computador para testar de forma muito rápida e fácil.
A próxima seção detalha como instalar o Ghost local no [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) or [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) or alternatively  ou, ajudar a colocar o Ghost para rodar em seu [servidor ou hospedagem]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Começando

Se você nao gosta de seguir instruções de como instalar o Node.js e o Ghost manualmente, o pessoal do [BitNami](http://bitnami.com/) criou [ os instaladores do Ghost](http://bitnami.com/stack/ghost) para as principais plataformas.

Eu quero instalar o Ghost no:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Se você ja decidiu em colocar o Ghost em seu servidor, isso é uma ótima notícia! A documentação a seguite irá guia-lo sobre as várias formas de implantar o Ghost, de formas manuais a instaladores de um clique.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Colocar o Ghost no Ar</a>
</div>

Lembra-se que o Ghost ainda é muito novo e a equipe está trabalhando duro para entregar funcionalidades em um ritmo furioso. Se você precisa atualizar o Ghost para a última versão, sigua nossa [documentação para atualização](/installation/upgrading/).
Se você ficar preso, confira o [>guia de solução de problemas]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), ou se isso não te ajudar, entre em contato pelo [Ghost forum](http://ghost.org/forum) onde a Administração e a comunidade estarão de braços abertos para ajudar com seus problemas.
