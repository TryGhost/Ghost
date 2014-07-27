---
lang: pl
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## Ogólny Zarys <a id="overview"></a>

Dokumentacja Ghost-a jest dopracowywana i udoskalana regularnie. Jeśli masz jakieś sugestje lub utkniesz to daj nam znać.

Ghost został zbudowany używając Node.js [Node.js](http://nodejs.org), i wymaga wersji  `0.10.*` (ostatnia stabilna wersja).

Uruchomienie Ghosta lokalnie na twoim komputerze jest proste ale wymagana jest instalacja Node.js pierw. 

### Co to Node.js?

[Node.js](http://nodejs.org) to nowoczesna platforma do budowania szybkich, skalowalnych i wydajnych aplikacji webowych.
    Przez ostanie 20 lat, siec rozwianela sie z kolekcji statycznych stron w platforme z mozliwoscia wspierania skomplikowanych aplikcji webowych jak Gmail i Facebook.
    JavaScript to język programowania, ktory umozliwil ten postep.

[Node.js](http://nodejs.org) daje nam mozliwosc pisania JavaScript na serwerze. Przedtem JavaScript istniały tylko w przeglądarce, i drugi język programowania, na przykład PHP, był potrzebny do programownia po stronie serwera. Posiadanie aplikacji webowej, ktora uzywa tylko jednego jezyka programownia jest wieką korzyscią i to powoduje że Node.js jest dostępny dla deweloperow ktorzy orginalnie pozostali by przy tworzeniu stron od strony interfejsu.

[Node.js](http://nodejs.org) umożliwia nam to poprzez zawijanie silnik JavaScript z przeglądarki Google Chrome i daje możliwosć instalacji tego gdziekolwiek. To oznacza że możesz zainstalować Ghost-a na twoim komputerze aby go wyprowbowac bardzo łatwo i szybko.
    Następujące częsci opisują szczegolowo jak zainstalować Ghost lokalnie na [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/), [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) lub pomoże w wdrożeniu Ghost-a na twoim koncie [serweru lub hostingu]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Jak Zacząć

If you don't fancy following instructions on installing Node.js and Ghost manually, the lovely people over at [BitNami](http://bitnami.com/) have created [Ghost installers](http://bitnami.com/stack/ghost) for all major platforms.

I want to install Ghost on:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

If you've already decided to deploy Ghost to your server or hosting account, that's great news! The following documentation will walk you through various options for deploying Ghost, from manual setups, to one-click installers.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Remember that Ghost is brand new, and the team are working hard to deliver features at a furious pace. If you need to upgrade Ghost to the latest version, follow our [upgrading documentation](/installation/upgrading/).
    If you get stuck, checkout the [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), or if that doesn't help, please get in touch via the [Ghost forum](http://ghost.org/forum) where the Ghost staff and community are on hand to help you with any problems.

