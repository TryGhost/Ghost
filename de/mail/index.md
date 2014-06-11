---
lang: de
layout: mail
meta_title: Ghost Email-Konfiguration - Ghost-Dokumentation
meta_description: Wie du deinen Email-Server richtig konfigurierst und mit Ghost Emails verschickst
heading: Email-Konfiguration
chapter: mail
---

## Email-Konfiguration <a id="email-config"></a>

Die folgenden Zeilen beschreiben, wie du Email in Ghost richtig konfigurierst. Ghost verwendet [Nodemailer](https://github.com/andris9/Nodemailer), deren Dokumentation enthält auch noch einige weitere Beispiele.

### Moment, worum geht es?

Falls du Erfahrung mit PHP hast, bist du es vermutlich gewöhnt dass Email wie durch Magie einfach funktioniert. In Node ist das anders, da es noch recht neu ist, fehlt es etwas an Feinschliff.

### Aber weshalb?

Momentan versendet Ghost nur Emails, um dir ein neues Passwort zuzusenden falls du es vergessen solltest. Auch wenn das nicht nach viel klingt, unterschätze nicht wie nützlich das ist falls du es mal brauchen solltest.

Aber keine Angst, die Email-Einstellungen müssen nur einmalig vorgenommen werden und wir zeigen dir hier, wie das geht.

## In Ordnung, wie mache ich es? <a id="how-to"></a>

Als erstes benötigst du einen Account mit einem Email-Service. Wir empfehlen dir Mailgun, sie bieten einen kostenlosen Account der dir erlaubt mehr Mails zu versenden als die meisten Blogs mit Email-Subskriptionen jemals brauchen werden. Du kannst ebenfalls Gmail oder Amazon SES verwenden.

Sobald du dich für einen Service entschieden hast, musst du die Einstellungen in Ghosts Konfigurationsdatei hinzufügen. Egal wo du Ghost installiert hast, die <code class="path">config.js</code> findest  immer im Überverzeichnis, wo auch die <code class="path">index.js</code> liegt. Falls du noch keine <code class="path">config.js</code> hast, kopiere die <code class="path">config.example.js</code> und benenne sie entsprechend um.

### Mailgun <a id="mailgun"></a>

Gehe auf [mailgun.com](http://www.mailgun.com/) und registriere dir einen Account. Du benötigst dafür eine Email-Adresse und du musst entweder eine Domain oder eine Subdomain eingeben. Diese lässt sich später ändern, weshalb du einfach eine Subdomain mit einem Namen ähnlich zu dem deines Blogs erstellen könntest.

Sobald du deine Email-Adresse verifiziert hast, kannst du auf das großartige Control Panel zugreifen Du benötigst nun deinen neuen Email-Nutzernamen und Passwort, welche Mailgun für dich angelegt hat, indem du auf deine Domain auf der rechten Seite klickst (sie unterscheiden sich von deinen bei der Registrierung eingegebenen). Im folgenden findest du einen kleinen Screencast, der dir zeigt wo du diese findest.

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />

Jetzt, wo du alles hast was du brauchst, wird es Zeit deine Konfigurationsdatei zu öffnen. Öffne deine <code class="path">config.js</code> mit dem Editor deiner Wahl, navigiere zur Environment deiner Wahl und ändere die Einstellungen ab, so dass sie so aussehen:

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

Füge deinen Nutzernamen zwischen die einfachen Anführungszeichen bei 'user' ein und dein Passwort bei 'pass'. Wenn man Mailgun für den Account 'tryghosttest' Account einrichtet, sieht es in etwa so aus:

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

Achte auf alle Kommas, Anführungszeichen und geschweifte Klammern. Falls eine falsch gesetzt ist, wirst du schräge Fehler bekommen.

Du kannst die Einstellungen für die development und production Environments wiederverwenden, falls du beide hast.

### Amazon SES <a id="ses"></a>

Du kannst dich für für Amazon's Simple Email Service unter <http://aws.amazon.com/ses/> registrieren. Sobald du das getan hast, wirst du einen Zugangsschlüssel und einen geheimen Schlüssel erhalten.

Öffne Ghosts <code class="path">config.js</code>-Datei in einem Editor deiner Wahl, navigiere zu deiner Environment für das du Email einrichten willst und füge deine Amazon-Zugangsdaten folgendermaßen hinzu:

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

Es ist möglich, Gmail zum Versenden aus Ghost zu verwenden. Falls du das planst, empfehlen wir dir einen [neuen Account](https://accounts.google.com/SignUp) für diesen Zweck zu erstellen, statt einen persönlichen Account zu verwenden.

Sobald du einen neuen Account erstellt hast, kannst du die Einstellungen in der <code class="path">config.js</code> vornehmen. Öffne sie in einem Editor deiner Wahl, navigiere zu der Environment, für die du Email einrichten willst und ändere sie folgendermaßen ab:

```
mail: {
    transport: 'SMTP',
    service: "Gmail",
    options: {
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### Absender <a id="from"></a>

Standardmäßig ist der Absender bei von Ghost versendeten Emails die Adresse, die auf der Einstellungsseite eingetragen wurde. Falls du diese überschreiben willst, kann du sie auch in deiner <code class="path">config.js</code> eintragen.

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
