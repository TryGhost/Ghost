---
lang: da
layout: translations
meta_title: S&aring;dan overs&aelig;tter du Ghost - Ghost dokumentation
meta_description: En guide til hvordan du hj&aelig;lper med at overs&aelig;tte Ghost
heading: Overs&aelig;ttelse af Ghost
subheading: En guide til hvordan du hj&aelig;lper med at overs&aelig;tte Ghost
chapter: translations
---

{% raw %}

## Overs&aelig;ttelse af dokumentationen <a id="doc-translating"></a>

### Hent den nyeste udgave af Ghost docs

Hele Ghost's dokumentation (<http://docs.ghost.org>) ligger i grenen [<code class="path">gh-pages</code>](https://github.com/TryGhost/Ghost/tree/gh-pages) i Ghost's [GitHub repository](https://github.com/TryGhost/Ghost/).

For at starte med overs&aelig;ttelsen skal du f&oslash;rst oprette en 'fork' af vores [GitHub repository](https://github.com/TryGhost/Ghost/) gren til din egen konto. Det kan du g&oslash;re ved at klikke p&aring; 'fork' knappen i &oslash;verste h&oslash;jre hj&oslash;rne p&aring; GitHub.

Den ser s&aring;dan her ud: ![fork knap](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/translations-GitHub-fork.png)

Derefter skulle du kunne se din fork ved at g&aring; ind p&aring; <code class="path">github.com/\<your username\>/Ghost</code>.

N&aring;r du har kontrolleret at du har en fork, der virker skal du hente den ned p&aring; din computer. For at downloade en fork til din maskine, skal du f&oslash;lge disse trin (i Terminal / Command prompt);

1. K&oslash;r `git clone https://github.com/<your username>/Ghost.git -b gh-pages`
![GitHub klon](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/translations-gitclone.png)
2. K&oslash;r `cd Ghost`

Du burde nu v&aelig;re Ghost mappen i din Terminal / Command Prompt. If you also open the Ghost folder in your directory browser of choice, you will see all the files for the Ghost documentation.

### Tilf&oslash;jelse af din overs&aelig;ttelse

After following how to get the most recent Ghost documentation.

1. Duplicate the <code class="path">/da/</code> folder.
2. Rename the duplicated folder to your appropriate language code ([IETF language tag](http://en.wikipedia.org/wiki/IETF_language_tag)). e.g. <code class="path">en</code> or <code class="path">pt_BR</code>
<p class="note">
If you're unsure of your language code, feel free to ask on the [forum](http://ghost.org/forum).
</p>
3. Update all the `lang: da` fields at the top of each <code class="path">.md</code> file in your new directory to the same language code as your new directory.
4. Update all the `permalink: /da/*` fields at the the top of the <code class="path">.md</code> files that require it (not in all the files), to `permalink: /your_language_code/*`. <span class="note">Be sure to keep the content where `*` is, the same.</span>
5. Add your language and translations to the <code class="path">_config.yml</code> file. Follow the format already present, and remember to use the country code you have used in the above steps.
5. Start translating the <code class="path">.md</code> files in your new directory :)

#### Submitting your change

1. Open the terminal back up, where you should still be in your <code class="path">/Ghost</code> directory.
2. Run `git commit -a`
3. Name your commit message to sensibly reflect your addition / change. (press `i` to start typing your message) e.g "Included Welsh translations" or "Updated Welsh 'usage' docs". <span class="note">Save your commit message by pressing `ESC` and typing `:wq`, then press enter.</span>
4. Submit your changes to your GitHub fork by running `git push origin gh-pages`. This sometimes prompts your for your GitHub username / password - enter those. You should then see some success messages.
5. Navigate to your GitHub fork (<code class="path">github.com/\<your username\>/Ghost/tree/gh-pages</code>)
6. Click on the Pull Request button. ![GitHub Pull Request](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/translations-pullrequest.png)
7. Enter any additional details that need to be known in the 'description' box.
8. Submit your Pull Request to the <code class="path">TryGhost:gh-pages</code> branch (should be automatically set).
9. That's it, you're done. The Ghost team will review it and comment on any additional changes which need to be made.

### Updating a translation

To update a translation you can simply follow the steps in "Adding your translation", but ignoring all the setup and simply changing the required areas, or if you would prefer to follow a simpler alternative you can do it directly in [GitHub](http://github.com).

#### P&aring; GitHub

1. Find filen der skal &aelig;ndres i <https://github.com/TryGhost/Ghost/tree/gh-pages> repository.
2. Klik p&aring; filen
3. Klik 'Rediger'
4. Lav dine &aelig;ndringer
5. Tilf&oslash;j en fornuftig commit besked eks. "Updated Welsh 'usage' docs"
6. Tilf&oslash;j en fornuftig beskrivelse eks. "Fixed a typo in the 'usage' docs where ..."
7. Kontroller din tilf&oslash;jelse
8. Klik p&aring; "Propose this file change"
9. Feel good.

##  Overs&aelig;ttelse af Ghost platformen <a id="ghost-translating"></a>

**Coming soon**

{% endraw %}