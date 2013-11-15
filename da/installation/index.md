---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din on server - Ghost Docs
meta_description: Alt du har behov for at Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Kom i gang
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## Oversigt <a id="overview"></a>

Ghost dokumentation er stadig under udarbejdelse og vil l&oslash;bende blive opdateret og forbedret. Kontakt os, hvis du kører fast eller har forslag til forbedringer.

Ghost er bygget p&aring; [Node.js](http://nodejs.org), og kr&aelig;ver version `0.10.*` (seneste stabile version).

Hvis du vil k&oslash;re Ghost lokalt p&aring; din computer er det ligetil, men kr&aelig;ver at du installerer Node.js f&oslash;rst.

### Hvad er Node.js?

[Node.js](http://nodejs.org) er en moderne platform til at programmere hurtige, skalerbare og effektive web applikationer.
    Gennem de seneste 20 &aring;r har internettet udviklet sig fra at v&aelig;re en samling statiske sider til en platform der kan underst&oslash;tte komplekse web applikationer som Gmail og facebook.
    JavaScript er programmeringssproget der har gjort det muligt.

[Node.js](http://nodejs.org) giver os muligheden for at skrive JavaScript p&aring; serveren. Tidligere eksisterede JavaScript kun i browseren, og et andet programmeringssprog, som eks. PHP, var kr&aelig;vet for at skrive p&aring; serveren. At have en web applikation der kun best&aring;r af et enkelt programmeringssprog er en stor fordel, hvilket ogs&aring; g&oslash;r Node.js tilg&aelig;ngeligt for udviklere, som traditionelt set har holdt sig til programmering i browseren.

M&aring;den hvorp&aring; [Node.js](http://nodejs.org) g&osalsh;r det muligt, er ved at pakke JavaScript motoren fra Google's Chrome browser og g&oslash;re det muligt at installere den over alt. Det betyder at du kan installere Ghost p&aring; din computer for hurtigt og nemt at pr&oslash;ve det.

    Den følgende sektion beskriver i detaljer hvordan du installerer Ghost lokalt på [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) eller [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) eller alternativt will help you get Ghost deployed on a [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

    The following sections detail how to install Ghost locally on [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) or [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) or alternatively will help you get Ghost deployed on a [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

### Kom i gang

If you don't fancy following instructions on installing Node.js and Ghost manually, the lovely people over at [BitNami](http://bitnami.com/) have created [Ghost installers](http://bitnami.com/stack/ghost) for all major platforms.

Jeg vil installere Ghost p&aring;:

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

