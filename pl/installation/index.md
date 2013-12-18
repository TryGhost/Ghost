---
lang: pl
layout: installation
meta_title: Jak zainstalować Ghosta na swoim serwerze - Dokument
meta_description: Wszystko, czego potrzebujesz, aby uzyskać platformę blogową Ghost i uruchomić ją w środowisku lokalnym lub zdalnym.
heading: Instalacja i pierwsze kroki z Ghostem
subheading: Pierwsze kroki do instalacji Twojego nowego bloga po raz pierwszy.
chapter: installation
next_section: mac
---

## Wstęp <a id="overview"></a>

Dokumentacja Ghosta jest w dużej mierze trakcie budowy, regularnie uzupełniana i ulepszana. Jeśli potrzebujesz pomocy lub chcesz zasugerować poprawki, skontaktuj się z nami.

Ghost jest oparty o platformę [Node.js](http://nodejs.org) i wymaga wersji `0.10.*` (najnowszej stabilnej). 

Uruchomienie Ghosta lokalnie jest proste, jednak wymaga uprzedniej instalacji Node.js.

### Czym jest Node.js?

[Node.js](http://nodejs.org) jest nowoczesną platformą do budowy szybkich, skalowalnych i wydajnych aplikacji internetowych.
	Przez ostatnie 20 lat sieć Internet wyewoluowała ze zbioru statycznych dokumentów w stronę platformy umożliwiającej działania kompleksowych aplikacji webowych takich jak Gmail czy Facebook.
	JavaScript jest językiem programowania, który umożliwił taki postęp.

[Node.js](http://nodejs.org) umożliwia pisanie kodu JavaScript po stronie serwera. W przeszłości język ten działał wyłącznie wewnątrz przeglądarki internetowej, zaś do programowania po stronie serwera niezbędny był drugi język, na przykład PHP. Posiadanie aplikacji napisanej w jednym języku programowania jest wielką korzyścią, która czyni Node.js bardziej dostępnym także dla developerów, którzy dotąd pracowali z kodem jedynie po stronie klienckiej.

Sposób, w jaki jest to możliwe z [Node.js](http://nodejs.org), polega na opakowaniu silnika JavaScript z przeglądarki Google Chrome i uczynieniu go możliwym do instalacji wszędzie. Oznacza to, że możesz niezwykle łatwo i szybko zainstalować Ghosta na swoim komputerze

		Poniższe sekcje opisują szczegółowo proces instalacji Ghosta lokalnie w systemie Max, Windows i Linux. Dowiesz się również, jak uruchomić Ghosta na serwerze lub koncie hostingowym.

	
    The following sections detail how to install Ghost locally on [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) or [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) or alternatively will help you get Ghost deployed on a [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

### Getting started

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

