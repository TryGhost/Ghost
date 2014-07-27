---
lang: pl
layout: installation
meta_title: Jak zainstalować Ghost-a na Twoim Serwerze - Ghost Docs
meta_description: Wszystko co potrzebujesz aby uruchomić platformę do blogowania Ghost na lokalnym lub zdalnym środowisku.
heading: Instalacja Ghost-a &amp; Wprowadzenie
subheading: Pierwsze kroki ustawiania twojego nowego bloga poraz pierwszy.
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

Jeśli nie chcesz czytać instrukcji jak zainstalować Node.js i Ghost-a ręcznie, mili ludzie w [BitNami](http://bitnami.com/) stworzyli [instalatory dla Ghost-a] (http://bitnami.com/stack/ghost) na wszystkie główne platformy.

Ja chcę zainstalować Ghost-a na:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Jeśli już zdecydowałeś wdrożyć Ghost-a na twoim serwerze lub na koncie hostingowym to super! Następująca dokumentacja poprowadzi ciebie przez rożne możliwości wdrażania Ghost-a, od odręcznego ustawienia do instalatorów wymagających jedno kliknięcie.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Pamiętaj że Ghost jest nowiutki i zespół wciąż ciężko pracuje aby dostarczyć nowe funkcje w szybkim tempie. Jeśli potrzebujesz uaktualnić Ghost-a do najnowszej wersji, to zobacz naszą [dokumentacje jak aktualizować](/installation/upgrading/).
    Jeśli utkniesz, zobacz nasz [przwodnik do rozwiązywania problemów]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), lub jeśli to ci nie pomoże, skontaktuj się z nami poprzez [forum Ghost-a](http://ghost.org/forum) gdzie pracownicy i wspólnota Ghost-a są chętni aby ci pomoc z problemami.
