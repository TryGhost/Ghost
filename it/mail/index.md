---
lang: it
layout: mail
meta_title: Configurazione Email di Ghost - Documentazione Ghost
meta_description: Come configurare il tuo server email e inviare email con la piattaforma di blogging Ghost. Tutto ciò che devi sapere.
heading: Configurare le Email
chapter: mail
---


## Configurazione Email <a id="email-config"></a>

La documentazione seguente spiega come configurare le email in Ghost. Ghost utilizza [Nodemailer](https://github.com/andris9/Nodemailer), la loro documentazione contiene diversi altri esempi di configurazione. 

### Cosa aspetti?

Se hai familiarità con PHP, allora sarai abituato ad avere le email magicamente funzionanti sulla tua piattaforma di hosting. Node è un po' diverso, è nuovo e brillante e ancora acerbo sotto alcuni aspetti.

Ma non aver paura, configurare le email è una cosa che va fatta una sola volta e questa guida ti darà una mano.

### Ma perché?

Al momento, l'unico utilizzo delle email da parte di Ghost è durante l'invio di una nuova password nel caso dimenticassi la tua. Non è molto, ma non sottovalutare l'utilità di questa funzione nel caso ne dovessi mai aver bisogno.

In futuro, Ghost supporterà la sottoscrizione via email ai tuoi blog. Dovranno essere inviati i dettagli degli account dei nuovi utenti via email, ed anche altre piccole funzionalità ausiliarie necessiteranno di inviare email.

## Ok, allora come si fa? <a id="how-to"></a>

La prima cosa di cui avrai bisogno è un account con un servizio di invio email. Noi raccomandiamo fortemente Mailgun. Forniscono un ottimo account gratuito che ti permette di inviare migliaia di mail a costo zero. Puoi anche usare Gmail o Amazon SES.

Appena hai deciso quale servizio email utilizzare, avrai bisogno di aggiungere le tue impostazioni al file di configurazione di Ghost. Dopo aver installato Ghost, dovresti trovare un file <code class="path">config.js</code> nella cartella principale, insieme al file <code class="path">index.js</code>. Se non hai ancora un file <code class="path">config.js</code>, copia il file <code class="path">config.example.js</code> e rinominalo.

### Mailgun <a id="mailgun"></a>

Vai su [mailgun.com](http://www.mailgun.com/) e registra un account. Avrai bisogno di un indirizzo email, e ti verrà chiesto di fornire un nome di dominio, o un sottodominio. Puoi cambiarlo successivamente, quindi per ora potresti usare un sottodominio simile al nome del blog che stai impostando.

Una volta che il tuo indirizzo email è stato verificato da Mailgun, avrai accesso al loro adorabile pannello di controllo. Troverai il tuo nuovo nome utente e password creati per te da Mailgun (non sono gli stessi con cui ti sei registrato), cliccando sul nome dominio a destra… guarda il breve video qua sotto, ti aiuterà a trovare questi dati.

<img src="http://imgur.com/6uCVuZJ.gif" alt="Dati Mailgun" width="100%" />   

Bene, adesso hai tutto ciò di cui hai bisogno. È ora di aprire il tuo file di configurazione. Apri il file <code class="path">config.js</code> nel tuo editor preferito. Raggiungi l'ambiente per il quale vuoi configurare le email, e modifica le tue impostazioni email così:

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

Inserisci il "Login" di Mailgun fra le virgolette dopo "user" e la "Password" nelle virgolette dopo "pass". Se stessi configurado MailGun con l'account 'tryghosttest', otterresti questa configurazione:

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

Fai attenzione ai caratteri speciali all'interno del file: due punti, virgolette e parentesi graffe. Se ne sposti o dimentichi uno, riceverai strani errori.

Puoi riutilizzare le tue impostazioni per entrambi gli ambienti development e production, se utilizzi entrambi.

### Amazon SES <a id="ses"></a>

Puoi registrare un account con Amazon Simple Email Service all'indirizzo <http://aws.amazon.com/ses/>. Appena l'avrai fatto, riceverai una chiave di accesso e una chiave segreta.

Apri il file di configurazione di Ghost, <code class="path">config.js</code>, nel tuo editor preferito. Raggiungi l'ambiente per il quale vuoi configurare le email, ed aggiungi le credenziali di Amazon come mostrato qui:

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

È possibile utilizzare Gmail per inviare email da Ghost. Se vuoi farlo, ti consigliamo di [creare un nuovo account](https://accounts.google.com/SignUp) apposito, invece di utilizzare il tuo account personale.

Appena avrai creato un nuovo account, puoi configurare il file di configurazione di Ghost, <code class="path">config.js</code>. Apri il file nel tuo editor preferito. Raggiungi l'ambiente per il quale vuoi configurare le email, e configuralo come mostrato qui:

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### L'indirizzo From <a id="from"></a>

Di default, l'indirizzo `from` utilizzato da Ghost sarà impostato con l'indirizzo email che trovi nella pagina di impostazioni generali. Se vuoi cambiarlo, puoi configurarlo nel file <code class="path">config.js</code>:

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
