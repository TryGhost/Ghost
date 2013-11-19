---
lang: da
layout: installation
meta_title: S&aring;dan installerer du Ghost p&aring; din server - Ghost dokumentation
meta_description: Alt du har behov for, for at f&aring; Ghost blogging platform op og k&oslash;re p&aring; din lokale maskine eller server eller hosting service.
heading: Installation af Ghost &amp; Kom i gang
subheading: De f&oslash;rste trin til at f&aring; oprettet din nye blog for f&oslash;rste gang.
chapter: installation
next_section: mac
---

## Oversigt <a id="overview"></a>

Ghost dokumentationen er stadig under udarbejdelse og vil l&oslash;bende blive opdateret og forbedret. Kontakt os, hvis du k&oslash;rer fast eller har forslag til forbedringer.

Ghost er bygget p&aring; [Node.js](http://nodejs.org), og kr&aelig;ver version `0.10.*` (seneste stabile version).

At k&oslash;re Ghost lokalt p&aring; din computer er ligetil, men kr&aelig;ver at du installerer Node.js f&oslash;rst.

### Hvad er Node.js?

[Node.js](http://nodejs.org) er en moderne platform til at programmere hurtige, skalerbare og effektive web applikationer.
    Gennem de seneste 20 &aring;r har internettet udviklet sig fra at v&aelig;re en samling statiske sider til en platform der kan underst&oslash;tte komplekse web applikationer som Gmail og facebook.
    JavaScript er programmeringssproget der har gjort det muligt.

[Node.js](http://nodejs.org) giver os muligheden for at skrive JavaScript p&aring; serveren. Tidligere eksisterede JavaScript kun i browseren, og et andet programmeringssprog, som eks. PHP, var kr&aelig;vet for at skrive p&aring; serveren. At have en web applikation der kun best&aring;r af et enkelt programmeringssprog er en stor fordel, hvilket ogs&aring; g&oslash;r Node.js tilg&aelig;ngeligt for udviklere, som traditionelt set har holdt sig til programmering i browseren.

M&aring;den hvorp&aring; [Node.js](http://nodejs.org) g&osalsh;r det muligt, er ved at pakke JavaScript motoren fra Google's Chrome browser og g&oslash;re det muligt at installere den hvor som helst. Det betyder at du kan installere Ghost p&aring; din computer for hurtigt og nemt at pr&oslash;ve det.
    De f&oslash;lgende sektioner beskriver i detaljer hvordan du installerer Ghost lokalt p&aring; [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) og [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) eller alternativt vil hj&aelig;lpe dig med at f&aring; Ghost sat op p&aring; en [server eller hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) service.

### Kom i gang

Hvis du helst vil undg&aring; at skulle f&oslash;lge instruktioner for manuelt at installere Node.js og Ghost, s&aring; har de sk&oslash;nne mennesker fra [BitNami](http://bitnami.com/) lavet [Ghost installationer](http://bitnami.com/stack/ghost) til alle st&oslash;rre platforme.

Jeg vil installere Ghost p&aring;:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Hvis du allerede har besluttet dig for at s&aelig;tte Ghost op p&aring; din server eller hosting service, er det gode nyheder! Denne dokumentation vil trin for trin gennemg&aring; de forskellige muligheder for at s&aelig;tte Ghost op, from manual setups, to one-click installers.

If you've already decided to deploy Ghost to your server or hosting account, that's great news! The following documentation will walk you through various options for deploying Ghost, from manual setups, to one-click installers.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Husk at Ghost er helt nyt og at folkene bag arbejder h&aring;rdt p&aring; at levere nye funktioner i et rasende tempo. Har du behov for at opdatere Ghost til den seneste version skal du f&oslash;lge vores [opdaterings dokumentation](/installation/upgrading/).
    Hvis du k&oslash;rer fast s&aring; tjek vore [fejlfindings guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), eller hvis det ikke hj&aelig;lper s&aring; kontakt os gennem [Ghost forummet](http://ghost.org/forum) hvor personerne bag Ghost og folkene omkring er parate til at hj&aelig;lpe dig uanset problemmet.

