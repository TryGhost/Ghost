---
lang: it
layout: usage
meta_title: Come usare Ghost - Documentazione Ghost
meta_description: Una guida approfondita all'utilizzo della piattaforma di blogging Ghost. Hai Ghost ma non sai da dove cominciare? Parti da qui!
heading: Usare Ghost
subheading: Configura la tua installazione
chapter: usage
section: settings
permalink: /it/usage/settings/
prev_section: configuration
next_section: managing
---

##  Configurazione di Ghost <a id="settings"></a>

Visita <code class="path">&lt;la tua URL&gt;/ghost/settings/</code>.

Una volta che hai finito di modificare le impostazioni, **clicca** sul pulsante "Save", in modo che le modifiche apportate vengano salvate.

Puoi verificare le tue modifiche visitando il tuo Blog.

### Configurazione del Blog (<code class="path">/general/</code>)

Queste sono le impostazioni specifice del Blog.

*   **Blog Title**: Cambia il titolo del Blog. Variabile nei temi `@blog.title`.
*   **Blog Description**: Cambia la descrizione del Blog. Variabile nei temi `@blog.description`.
*   **Blog Logo**: Carica un logo per il Blog nei formati '.png', '.jpg' o '.gif'. Variabile nei temi `@blog.logo`.
*   **Blog Cover**: Carica un'immagine di cover per il Blog nei formati '.png', '.jpg' o '.gif'. Variabile nei temi `@blog.cover`.
*   **Email Address**: Questo è l'indirizzo email al quale vengono mandate notifiche di sistema. **Deve** essere un indirizzo email valido.
*   **Posts per page**: Il numero di post mostrati in ogni pagina. Deve essere un valore numerico.
*   **Theme**: Una lista di temi presenti nella cartella <code class="path">content/themes</code>. Selezionane uno dal dropdown per cambiare il look del Blog.

### Configurazione dell'Utente (<code class="path">/user/</code>)

Queste sono le impostazioni relative al profilo utente/autore.

*   **Your Name**: Il nome dell'autore mostrato nei post. Variabile nei temi (post) `author.name`.
*   **Cover Image**: L'immagine cover del tuo profilo, nei formati '.png', '.jpg' o '.gif'. Variabile nei temi (post) `author.cover`.
*   **Display Picture**: La tua immagine personale, nei formati '.png', '.jpg' o '.gif'. Variabile nei temi (post) `author.image`.
*   **Email Address**: Questa email sarà il tuo indirizzo pubblico e anche quello al quale verranno mandate notifiche. Variabile nei temi (post) `author.email`.
*   **Location**: La tua posizione attuale. Variabile nei temi (post) `author.location`.
*   **Website**: L'URL del tuo sito personale o il tuo profilo su un social network. Variabile nei temi (post) `author.website`.
*   **Bio**: Puoi parlare brevemente di te, descriviti in 200 caratteri. Variabile nei temi (post) `author.bio`.

#### Cambiare la password

1.  Riempi i campi di testo con le password richieste (attuale / nuova password).
2.  Poi clicca **Change Password**.
<p class="note">
    <strong>Nota:</strong> La password viene cambiata solo se premi il pulsante "Change Password", il pulsante "Save" non modifica la password.
</p>

