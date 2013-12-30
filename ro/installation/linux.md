---
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ro/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Instalarea pe Linux <a id="install-linux"></a>

### Instalează Node

*   Descarcă arhiva `.tar.gz` de la [http://nodejs.org](http://nodejs.org) sau [instalează folosind un manager de pachete](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
*   Verifică dacă instalarea s-a efectuat corect executând `node -v` și `npm -v` într-un terminal

### Instalează și rulează Ghost


**Dacă folosești Linux pe un desktop, execută următorii pași:**

*   Loghează-te pe [http://ghost.org](http://ghost.org) și dă click pe `Download Ghost Source Code`
*   Pe pagina de descărcare alege ultima arhivă zip și extrage fișierele în locul de unde vrei să rulezi Ghost

**Dacă folosești Linux ca un sistem de operare gazdă sau prin SSH, sau dacă ai acces doar la un terminal, atunci:**

*   Folosește comanda următoare pentru a descărca ultima versiune de Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Dezarhivează fișierul și intră în director

    ```
    $ unzip -uo ghost.zip -d ghost
    ```

**După ce ai extras Ghost:**

*   Intră în director:

    ```
    $ cd /path/to/ghost
    ```

*   Pentru a instala Ghost:

    ```
    npm install --production
    ```

*   După ce s-a instalat npm:

    ```
    $ npm start
    ```

*   Ghost rulează pe **127.0.0.1:2368**<br />
    <span class="note">Poți modifica adresa de IP în **config.js**</span>

*   Într-un browser, navighează la [http://127.0.0.1:2368](http://127.0.0.1:2368) pentru a accesa Ghost
*   Accesează [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) și creează un administrator pentru a te putea loga