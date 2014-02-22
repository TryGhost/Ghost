---
layout: translations
meta_title: How to Translate Ghost - Ghost Docs
meta_description: A guide on how to help translate Ghost
heading: Translating Ghost
subheading: A guide on how to help translate Ghost
---

{% raw %}

## Translating the Documentation <a id="doc-translating"></a>

### Getting the most recent Ghost docs

All of Ghost's documentation (<http://docs.ghost.org>) is located in the [<code class="path">gh-pages</code>](https://github.com/TryGhost/Ghost/tree/gh-pages) branch on the Ghost [GitHub repository](https://github.com/TryGhost/Ghost/).

To start translating you will first need to 'fork' the [GitHub repository](https://github.com/TryGhost/Ghost/) branch to your own account. You can do this by clicking the 'fork' button in the top right corner of GitHub.

It looks like this: ![fork button](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/translations-GitHub-fork.png)

You should now be able to access you fork by navigating to <code class="path">github.com/\<your username\>/Ghost</code>.

Once you have verified you have a working fork, you will need to download it to your computer. To download the fork to your machine, you will need to follow these steps (in the Terminal / Command prompt);

1. Run `git clone https://github.com/<your username>/Ghost.git -b gh-pages`
![GitHub Clone](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/translations-gitclone.png)
2. Run `cd Ghost`

You should now be in the Ghost directory in your Terminal / Command Prompt. If you also open the Ghost folder in your directory browser of choice, you will see all the files for the Ghost documentation.

### Adding your translation

After following how to get the most recent Ghost documentation.

1. Duplicate the <code class="path">/example_translation/</code> folder.
2. Rename the duplicated folder to your appropriate language code ([IETF language tag](http://en.wikipedia.org/wiki/IETF_language_tag)). e.g. <code class="path">en</code> or <code class="path">pt_BR</code>
<p class="note">
If you're unsure of your language code, feel free to ask on the [forum](http://ghost.org/forum).
</p>
3. Update all the `lang: example_translation` fields at the top of each <code class="path">.md</code> file in your new directory to the same language code as your new directory.
4. Update all the `permalink: /example_translation/*` fields at the the top of the <code class="path">.md</code> files that require it (not in all the files), to `permalink: /your_language_code/*`. <span class="note">Be sure to keep the content where `*` is, the same.</span>
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

#### In GitHub

1. Locate the file that needs changing in the <https://github.com/TryGhost/Ghost/tree/gh-pages> repository.
2. Click on file
3. Click 'Edit'
4. Make your changes
5. Add a sensible commit message e.g. "Updated Welsh 'usage' docs"
6. Add a sensible description e.g. "Fixed a typo in the 'usage' docs where ..."
7. Read over your submission
8. Click "Propose this file change"
9. Feel good.

##  Translating the Ghost platform <a id="ghost-translating"></a>

**Coming soon**

Please do not send in translations for Ghost just yet, we are still setting up the best way to do this. We really don't want to throw away anyone's work.
{% endraw %}