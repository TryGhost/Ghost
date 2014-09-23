---
lang: it
layout: installation
meta_title: Come installare Ghost sul tuo server - Documentazione Ghost
meta_description: Tutto il necessario per far funzionare la piattaforma di blogging Ghost in locale e in remoto.
heading: Installazione di Ghost &amp; Primi passi
subheading: I primi passi per installare il tuo nuovo blog per la prima volta.
chapter: installation
next_section: mac
---

## Panoramica <a id="overview"></a>

<p class="note"><strong>Nota</strong> Ghost richiede Node.js <strong>0.10.x</strong> (l'ultima versione stabile). Ti raccomandiamo Node.js <strong>0.10.30</strong> e npm <strong>1.4.21</strong>.</p>

La documentazione di Ghost è ancora "Work in Progress", viene aggiornata e migliorata regolarmente. Se hai problemi o hai suggerimenti su come migliorare, faccelo sapere.

Ghost è sviluppato in [Node.js](http://nodejs.org), e richiede la versione `0.10.*` (l'ultima versione stabile).

Far funzionare Ghost in locale sul tuo computer è abbastanza semplice, ma prima è necessario installare Node.js.

### Cos'è Node.js?

[Node.js](http://nodejs.org) è una piattaforma moderna per sviluppare applicazioni web veloci, scalabili ed efficienti.
    Negli ultimi 20 anni, il web si è evoluto da un insieme di pagine statiche ad una piattaforma in grado di supportare applicazioni web complesse come Gmail e Facebook.
    JavaScript è il linguaggio di programmazione che ha consentito questo progresso.

[Node.js](http://nodejs.org) ci dà la possibilità di scrivere Javascript sul server. Nel passato Javascript è esistito soltanto nel browser, ed un secondo linguaggio di programmazione, come PHP, era necessario per programmare lato server. Avere un'applicazione web scritta in un solo linguaggio è un grosso beneficio, ed inoltre questo rende Node.js accessibile agli sviluppatori che tipicamente si sarebbero dedicati solo al client.

Tutto questo è possibile grazie al motore Javascript del browser Google Chrome, che fa parte di [Node.js](http://nodejs.org) e lo rende installabile ovunque. Questo significa che puoi installare Ghost sul tuo computer abbastanza in fretta e con facilità.
    Le sezioni seguenti descrivono come installare Ghost su [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) o [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) oppure ti aiuteranno a fare il deploy su un [server o hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Primi passi

Se non vuoi seguire le istruzioni per installare Node.js e Ghost manualmente, il dolcissimo team di [BitNami](http://bitnami.com/) ha creato dei [Ghost installers](http://bitnami.com/stack/ghost) per le maggiori piattaforme.

Voglio installare Ghost su:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Se hai già deciso di installare Ghost sul tuo server o hosting personale, è una grande notizia! Questa documentazione ti mostrerà diversi modi per fare il deploy di Ghost, dall'installazione manuale, agli installer one-click.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghost live su un server</a>
</div>

Ricordati che Ghost è molto giovane, ed il team sta lavorando duramente per implementare funzionalità ad un ritmo frenetico. Se hai bisogno di aggiornare Ghost all'ultima versione, segui la [guida all'aggiornamento](/installation/upgrading/).
    Se hai problemi, dai un'occhiata alla [guida alla risoluzione dei problemi]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), o se non è sufficiente, per favore scrivi sul [forum di Ghost](http://ghost.org/forum) dove lo staff e la community sono disponibili per aiutarti con qualsiasi problema.

