---
lang: pl
layout: installation
meta_title: Jak zainstalować Ghost'a na swoim serwerze - dokumentacja Ghost.
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Instalowanie Ghost'a &amp; Pierwsze kroki
subheading: Pierwsze kroki do utworzenia nowego bloga po raz pierwszy.
permalink: /pl/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Instalacja na Windows <a id="install-windows"></a>

### Instalowanie Node

*   Na stronie [http://nodejs.org](http://nodejs.org) znajdź plik instalatora dla Windows "Windows Installer (.msi)"
*   Click on the download to open the installer, this is going to install both Node and npm. Kliknij odpowiednio dla siebie 32-bit lub 64-bit, dzięki czemu ściągniemy instalator, który zainstaluje Node and npm.
*   Kliknij na instalator, przechodź przez poszczególne kroki do momentu gdy pojawi się informacja o pomyślnej instalacji Node.js.

Jeśli zatrzymasz się na jakimś etapie, możesz obejrzeć ten [możesz obejrzeć ten proces tutaj](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Instalacja node na Windows").

### Ściągnij & Rozpakuj Ghost'a

*   Zaloguj się na [http://ghost.org](http://ghost.org) i kliknij na niebieski przycisk 'Download Ghost Source Code'.
*   Na stronie pobierania naciśnij przycisk, aby pobrać najnowszy plik zip.
*   Kliknij strzałkę obok nowo pobranego pliku i wybierz 'Pokaż w folderze ".
*   Kiedy otwierzy folder, kliknij prawym przyciskiem myszy na pobrany plik zip i wybierz "Extract all '.

Jeśli zatrzymasz się na jakimś etapie, możesz obejrzeć ten [możesz obejrzeć ten proces tutaj](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Instalowanie Ghost'a na Windows Część 1").

### Instalacja i Uruchomienie Ghost'a

*   In your start menu, find 'Node.js' and then choose 'Node.js Command Prompt' W menu start znajdź "Node.js" a następnie wybierz opcję 'Node.js Command Prompt'.
*   W 'Node command prompt' musisz zmienić ścieżkę na taką w której został rozpakowany Ghost. Standardowo: `cd Downloads/ghost-#.#.#` (hash zastąp wersją pobranego Ghost'a).
*   Następnie, w wierszu polecenia wpisz: `npm install --production` <span class="note">zwróć uwagę na dwie kreski przed 'production'</span>
*   Kiedy npm zakończy inbstalację , wybierz `npm start` to polecenie uruchomi Ghost'a w trybie development.
*   W przeglądarce przejdź na adres <code class="path">127.0.0.1:2368</code>, aby zobaczyć nowo skonfigurowanego Ghost'a.
*   Zmień url na <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin. i stwórz administratora, abyś mógł się zalogować na konto Ghost admin.
*   Zobacz [dokumentację](/usage) w celu przejścia przez kolejne kroki.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Instalacja Ghost'a ona Windows - Część 2")

