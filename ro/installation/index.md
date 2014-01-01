---
lang: ro
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## Descriere <a id="overview"></a>

Documentația pentru Ghost e în curs de dezvoltare și este actualizată regular. Dacă vă blocați la un pas sau aveți sugestii de îmbunătăți-re, dă-ne un mesaj.
Ghost este construit pe [Node.js](http://nodejs.org) și are ca cerință minimă versiunea `0.10.*` (ultima versiune actuală).
Running Ghost locally on your computer is straight forward, but requires that you install Node.js first.
Rularea Ghost pe propria mașină nu necesită configurare în prealabil, dar trebuie să aveți Node instalat.

### Ce este Node.js?

[Node.js](http://nodejs.org) este o platformă modernă pentru construirea rapidă, scalabilă și eficientă a aplicațiilor web.
    În cursul a 20 de ani internetul a evoluat dintr-o colecție de pagini statice într-o platformă capabilă de a suporta aplicații web complexe cum ar fi Gmail sau Facebook.
    JavaScript este limbajul de programare care a făcut progresul posibil.

[Node.js](http://nodejs.org) are abilitatea de a scrie JavaScript pe server. În trecut JavaScript a existat doar în browser și era necesară un al doilea limbaj de programare, cum ar fi PHP, pentru procesarea pe server. Abilitatea de a scrie o aplicație web cu un singur limbaj este preferabilă și asta face Node.js accesibil dezvoltatorilor care ar fi lucrat altfel doar client-side.

Modul în care [Node.js](http://nodejs.org) face posibil acest lucru este prin prin împachetarea motorului JavaScript din Google Chrome și instalarea acestuia pe orice platformă. Asta înseamnă că poți instala Ghost pentru a-l testa pe mașina proprie ușor și rapid.
    Următoarele secțiuni descriu modul de instalare Ghost local pe un [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang}}{% endif %}/installation/windows/) sau [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) sau vă ghidează să instalați Ghost pe un [server sau serviciu de hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Introducere

Dacă nu vreți să instalați Ghost manual, [BitNami](http://bitnami.com/) oferă [pachete de instalare](http://bitnami.com/stack/ghost) pentru toate platformele majore.

Ghiduri de instalare pentru diferite sisteme de operare:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

If you've already decided to deploy Ghost to your server or hosting account, that's great news! The following documentation will walk you through various options for deploying Ghost, from manual setups, to one-click installers.
Dacă vrei să instalezi Ghost pe un server sau un serviciu de hosting, perfect! Documentația de mai jos vă ghidează pas cu pas sau oferă pachete de instalare cu un singur click.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Descarcă Ghost Live</a>
</div>

Țineți minte că Ghost este o platformă nouă și echipa noastră lucrează din greu pentru a livra funcții noi la o viteză cât mai mare. Dacă trebuie să upgradați Ghost la ultima versiune, urmați [documentația de upgradare](/installation/upgrading/).
    Dacă sunteți blocați, citiți [ghidul de rezolvare al problemelor comune]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), sau dacă nu vă ajută, postați un mesaj pe [Forumul Ghost](http://ghost.org/forum) unde comunitatea și stafful sunt gata să vă ajute.

