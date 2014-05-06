---
lang: pl
layout: mail
meta_title: Konfiguracja maila w platformie Ghost - Dokumentacja Ghost
meta_description: Wszystko co potrzebujesz wiedzieć na temat konfiguracji emaili i wysyłki wiadomości z platformy Ghost.
heading: Konfiguracja maila
chapter: mail
---


## Konfiguracja emaila <a id="email-config"></a>

Niniejsza dokumentacja opisuje proces konfiguracji emaila w Ghoście. Ghost wykorzystuje [Nodemailer'a](https://github.com/andris9/Nodemailer) - jego dokumentacja zawiera jeszcze więcej przykładów.

### Zaraz zaraz, że co?

Jeżeli miałeś styczność ze środowiskiem PHP, prawdopodobnie zdążyłeś przywyknąć do faktu, że email w Twoim serwisie hostingowym po prostu działa. Node jest nieco innym, stosunkowo nowym rozwiązaniem i wciąż wymaga dopracowania.

Ale nie obawiaj się. Proces konfiguracji emaila jest czynnością jednorazową i pokażemy Ci krok po kroku, jak to zrobić.


### Ale dlaczego?

W tym momencie jedyną rzeczą, do której Ghost wykorzystuje emaile jest wysyłka wiadomości zawierającej nowe hasło w przypadku zapomnienia starego. To niewiele, ale nie zapominaj, jak cenna może okazać się ta funkcja w przypadku, gdy będziesz jej potrzebował.

W przyszłości Ghost będzie również udostępniał możliwość subskrybowania Twoich blogów, wysyłanie nowym użytkownikom informacji o ich kontach i wiele innych przydatnych drobiazgów, które opierają się na wysyłaniu emaili.

## No dobrze, więc jak to zrobić? <a id="how-to"></a>

Pierwszą rzeczą, której będziesz potrzebował, jest konto w serwisie umożliwiającym wysyłanie maili. Szczególnie polecamy serwis Mailgun. Ich darmowe konto w zupełności wystarcza do tego, aby wysłać więcej wiadomości, niż potrzebuje większość blogów z subskrypcją email. Możesz także użyć Gmaila lub serwisu Amazon SES.

Gdy już wybierzesz serwis do wysyłania maili, powinieneś wprowadzić swoje ustawienia do pliku konfiguracyjnego Ghosta. W lokalizacji, w której zainstalowałeś Ghosta, powinieneś znaleźć w katalogu głównym pliki <code class="path">config.js</code> oraz <code class="path">index.js</code>. Jeżeli nie masz jeszcze pliku <code class="path">config.js</code>, skopiuj <code class="path">config.example.js</code> i zmień mu nazwę.

### Mailgun <a id="mailgun"></a>

Przejdź na stronę [mailgun.com](http://www.mailgun.com/) i załóż konto. Potrzebny będzie adres email, oprócz tego serwis poprosi Cię o podanie domeny lub adresu subdomeny. Możesz to później zmienić, więc najlepszym wyjściem będzie wybór nazwy subdomeny zbliżonej do nazwy bloga, którego zamierzasz uruchomić.

Po zweryfikowaniu adresu email w serwisie Mailgun otrzymasz dostęp do jego eleganckiego panelu administracyjnego. Kliknij adres swojej domeny, aby uzyskać nazwę użytkownika i hasło, które Mailgun stworzył dla Ciebie (to nie są te same dane, które podałeś w trakcie zakładania konta). Poniższy obrazek ilustruje, jak to zrobić.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />   

Teraz, gdy masz już wszystko, co jest Ci potrzebne, czas uzupełnić plik konfiguracyjny. Otwórz plik <code class="path">config.js</code> w swoim ulubionym edytorze. Przejdź do sekcji dotyczącej środowiska, dla którego chcesz uruchomić emaila i zmień ustawienia w następujący sposób:

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

Wklej swoją nazwę użytkownika ('Login') z Mailguna w cudzysłów obok słowa 'user', zaś hasło ('Password') wklej w cudzysłów obok słowa 'pass'. Przykładowa konfiguracja dla konta Mailguna o nazwie 'tryghosttest' wyglądałaby tak:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

Uważaj na wszystkie średniki, cudzysłowy i nawiasy klamrowe. Ich usunięcie lub umieszczenie w błędnym miejscu może powodować dziwne błędy.

Możesz użyć tych samych ustawień dla środowiska testowego i produkcyjnego, jeżeli masz oba z wymienionych.

### Amazon SES <a id="ses"></a>

Zarejestruj konto Amazon Simple Email Service na stronie <http://aws.amazon.com/ses/>. Gdy skończysz, otrzymasz kod dostępu (access key) i tajny klucz (secret).

Otwórz plik <code class="path">config.js</code> w swoim ulubionym edytorze. Przejdź do sekcji dotyczącej środowiska, dla którego chcesz skonfigurować email i dodaj dane dostepowe z Amazona analogicznie do przykładu poniżej:

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmail <a id="gmail"></a>

Da się użyć Gmaila do wysyłki maili z Ghosta. Jeżeli zamierzasz to zrobić, radzimy w tym celu [założyć nowe konto](https://accounts.google.com/SignUp) zamiast używać swój dotychczasowy adres.

Po założeniu nowego konta możesz podać jego ustawienia w pliku konfiguracyjnym Ghosta - <code class="path">config.js</code>. Otwórz ten plik w swoim ulubionym edytorze. Przejdź do sekcji dotyczącej środowiska, dla którego chcesz skonfigurować email i zmień swoje ustawienia w sposób analogiczny do poniższego

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'twojadres@gmail.com',
            pass: 'twojehaslo'
        }
    }
}
```

### Adres "Od" <a id="from"></a>

Domyślnie adres nadawcy ("Od") w mailach wysyłanych przez Ghosta będzie taki sam, jak adres e-mail podany w ustawieniach ogólnych. Jeżeli chcesz go nadpisać innym adresem, możesz to zrobić w pliku <code class="path">config.js</code>.

```
mail: {
    fromaddress: 'mojadres@email.com',
}
```
