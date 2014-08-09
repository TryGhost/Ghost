---
lang: pl
layout: installation
meta_title: Jak zainstalować Ghost-a na Twoim Serwerze - Ghost Docs
meta_description: Wszystko co potrzebujesz aby uruchomić platformę do blogowania Ghost na lokalnym lub zdalnym środowisku.
heading: Instalacja Ghost-a &amp; Wprowadzenie
subheading: Pierwsze kroki ustawiania twojego nowego bloga poraz pierwszy.
permalink: /pl/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Instalacja na Linux <a id="install-linux"></a>

### Zainstaluj Node

*   Albo ściągnij `.tar.gz` archiwum z [http://nodejs.org](http://nodejs.org), albo postępuj  według instrukcji na temat jak [zainstalować używając systemu zarządzania pakietami.] (https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
*   Sprawdź dwukrotnie że masz Node oraz npm zainstalowane poprzez wpisanie `node -v` i `npm -v` do terminalu

Zainstaluj i Uruchom Ghost

*   Na stronie [rzeczy do pobrania](https://ghost.org/download/), kliknij guzik aby ściągnąć najnowszy plik zip a następnie wydobądź plik do lokacji skąd chcesz uruchamiać Ghost-a
*   W oknie terminalu zmień katalog do korzenia wydobytego folderu Ghost-a
*   W terminalu wpisz `npm install --production` <span class="note">zwłaszcza z dwoma kreskami</span>
*   Kiedy npm skończył się instalować wpisz `npm start` aby zacząć Ghost-a w trybie deweloperski
*   W przeglądarce przejdź do <code class="path">127.0.0.1:2368</code> aby zobaczyć twój nowo urządzony blog Ghost-a
*   Zmień url na <code class="path">127.0.0.1:2368/ghost</code> i stwórz konto admina aby zalogować się do Ghost-a admina

Jeśli używasz Linux na gościnnym OS albo poprzez SSH i masz tylko terminal do użytku to:

*   Użyj twoją normalną przeglądarkę aby znaleźć URL pliku zip Ghost (zmienia się z każdą wersją), zapisz url ale zmień '/zip/' na '/archives/'
*   W oknie terminalu użyj `wget url-ghosta.zip` aby ściągnąć Ghost-a
*   Rozepnij archiwum używając `unzip -uo Ghost-#.#.#.zip -d ghost` i potem `cd ghost`
*   Wpisz `npm install --production` aby zainstalować Ghosta <span class="note">zwłaszcza z dwoma kreskami</span>
*   Kiedy npm skończył się instalować wpisz `npm start` aby zacząć Ghost-a w trybie deweloperski
*   Ghost będzie teraz uruchomiony na localhost


