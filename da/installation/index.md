---
lang: da
layout: installation
meta_title: Sådan installerer du Ghost på din server - Ghost dokumentation
meta_description: Alt du har behov for, for at få Ghost blogging platform op og køre på din lokale maskine eller server eller hosting service.
heading: Installation af Ghost &amp; Kom i gang
subheading: De første trin til at få oprettet din nye blog for første gang.
chapter: installation
next_section: mac
---

## Oversigt <a id="overview"></a>

Ghost dokumentationen er stadig under udarbejdelse og vil løbende blive opdateret og forbedret. Kontakt os, hvis du kører fast eller har forslag til forbedringer.

Ghost er bygget på [Node.js](http://nodejs.org), og kræver version `0.10.*` (seneste stabile version).

At køre Ghost lokalt på din computer er ligetil, men kræver at du installerer Node.js først.

### Hvad er Node.js?

[Node.js](http://nodejs.org) er en moderne platform til at programmere hurtige, skalerbare og effektive web applikationer.
    Gennem de seneste 20 år har internettet udviklet sig fra at være en samling statiske sider til en platform der kan understøtte komplekse web applikationer som Gmail og facebook.
    JavaScript er programmeringssproget der har gjort det muligt.

[Node.js](http://nodejs.org) giver os muligheden for at skrive JavaScript på serveren. Tidligere eksisterede JavaScript kun i browseren, og et andet programmeringssprog, som eks. PHP, var krævet for at skrive på serveren. At have en web applikation der kun består af et enkelt programmeringssprog er en stor fordel, hvilket også gør Node.js tilgængeligt for udviklere, som traditionelt set har holdt sig til programmering i browseren.

Måden hvorpå [Node.js](http://nodejs.org) gør det muligt, er ved at pakke JavaScript motoren fra Google's Chrome browser og gøre det muligt at installere den hvor som helst. Det betyder at du kan installere Ghost på din computer for hurtigt og nemt at prøve det.
    De følgende sektioner beskriver i detaljer hvordan du installerer Ghost lokalt på [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/), [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) og [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) eller alternativt vil hjælpe dig med at få Ghost sat op på en [server eller hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) service.

### Kom i gang

Hvis du helst vil undgå at skulle følge instruktioner for manuelt at installere Node.js og Ghost, så har de skønne mennesker fra [BitNami](http://bitnami.com/) lavet [Ghost installationer](http://bitnami.com/stack/ghost) til alle større platforme.

Jeg vil installere Ghost på:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Hvis du allerede har besluttet dig for at sætte Ghost op på din server eller hosting service, er det gode nyheder! Denne dokumentation vil trin for trin gennemgå de forskellige muligheder for at sætte Ghost op, from manual setups, to one-click installers.

If you've already decided to deploy Ghost to your server or hosting account, that's great news! The following documentation will walk you through various options for deploying Ghost, from manual setups, to one-click installers.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

Husk at Ghost er helt nyt og at folkene bag arbejder hårdt på at levere nye funktioner i et rasende tempo. Har du behov for at opdatere Ghost til den seneste version skal du følge vores [opdaterings dokumentation](/installation/upgrading/).
    Hvis du kører fast så tjek vore [fejlfindings guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), eller hvis det ikke hjælper så kontakt os gennem [Ghost forummet](http://ghost.org/forum) hvor personerne bag Ghost og folkene omkring er parate til at hjælpe dig uanset problemmet.

