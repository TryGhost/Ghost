---
lang: ro
layout: installation
meta_title: Cum să instalezi Ghost pe serverul tău - Documentație Ghost
meta_description: Tot ce trebuie să știi pentru a rula Ghost din mediul tău local sau remote.
heading: Instalare Ghost &amp; Noțiuni de bază
subheading: Primii pași pentru setarea noului tău blog pentru prima dată.
chapter: installation
next_section: mac
---

## Prezentare generală <a id="overview"></a>

Documentația Ghost este într-un proces continuu de îmbunătățire. Dacă ai probleme sau sugestii, te rog să ne anunți.

Ghost se bazează pe [Node.js](http://nodejs.org) și necesită versiunea `0.10.*` (cea mai recentă versiune stabilă).

Rularea Ghost locală pe calculatorul tău este simplă, dar este nevoie să instalezi Node.js înainte.

### Ce este Node.js?

[Node.js](http://nodejs.org) este o platformă modernă pentru construirea aplicațiilor web rapide, scalabile și eficiente.
	De-a lungul ultimilor 20 de ani, web-ul a evoluat de la o colecție de pagini statice la o platformă capabilă să susțină aplicații web complexe, precum Gmail și facebook.
	JavaScript este limbajul de programare care a permis acest progres.

[Node.js](http://nodejs.org) ne furnizează posibilitatea de a scrie cod JavaScript pe server. În trecut JavaScript a existat doar în browser și era nevoie de un al doilea limbaj de programare, precum PHP, pentru a programa server side. Având o aplicație web scrisă într-un singur limbaj de programare este un beneficiu major și acest lucru face Nodejs accesibil dezvoltatorilor care ar fi putut rămâne pe partea client.

[Node.js](http://nodejs.org) face acest lucru posibil prin împachetarea motorului JavaScript din Chrome. Asta înseamnă că poți instala Ghost pe calculatorul tău foarte rapid și ușor.
	Următoarele secțiuni detaliază instalarea Ghost local pe [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) sau [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) sau alternativ te va ajuta să instalezi Ghost pe un [server sau hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Primii pași

Dacă nu-ți place să instalezi manual Node.js și Ghost, oamenii minunați de la [BitNami](http://bitnami.com/) au creeat [instalări Ghost]((http://bitnami.com/stack/ghost)) pentru toate platformele.

Vreau să instalez Ghost pe:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Dacă deja te-ai decis să instalezi Ghost pe serverul sau contul tău de hosting, minunat! Capitolele următoare te rog ghida prin opțiunile de instalare Ghost, de la instalarea manuala la instalarea printr-un singur click.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Descarcă Ghost Live</a>
</div>

Ține minte că Ghost este foarte nou și echipa lucrează foarte rapid la caracteristici noi. Dacă ai nevoie să aduci Ghost la cea mai recentă versiune, urmează [ghidul de update](/installation/upgrading/).
	Dacă te împotmolești, uită-te și la [ghidul de rezolvare a problemelor]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/) sau dacă asta nu te ajută, te rog să iei legătura via [forumul Ghost](http://ghost.org/forum) unde comunitatea Ghost este pregătită să te ajute cu orice problemă.
