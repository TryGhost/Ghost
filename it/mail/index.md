---
lang: it
layout: mail
meta_title: Configurazione Email di Ghost - Documentazione Ghost
meta_description: Come configurare il tuo server email e inviare email con la piattaforma di blogging Ghost. Tutto ci&ograve; che devi sapere.
heading: Imposare le Email
chapter: mail
---


## Configurazione Email <a id="email-config"></a>

La documentazione seguente, spiega come configurare le email in Ghost. Ghost utilizza [Nodemailer](https://github.com/andris9/Nodemailer), la loro documentazione contiene anche pi&ugrave; esempi. 

### Cosa aspetti?

Se hai familiarit&agrave; con PHP, allora sarai abituato ad avere le email magicamente funzionanti sulla tua piattaforma di hosting. Node &egrave; un p&ograve; diverso, &egrave; nuovo e brillante e ancora un p&ograve; complesso sotto alcuni aspetti.

Ma non aver paura, impostare le tua email &egrave; una cosa che va fatta una sola volta e noi siamo qui per guidarti attraverso di essa.

### Ma perch&egrave;?

Al momento, l'unico utilizzo delle email da parte di Ghost &egrave; durante l'invio di una nuova password nel caso tu dimenticassi la tua. Non &egrave; molto, ma non sottovalutare l'utilit&agrave; di questa funzione nel caso ne dovessi mai aver bisogno.

Successivamente, Ghost supporter&agrave; la sottoscrizione via email ai tuoi blog. Inviando dettagli degli account dei nuovi utenti via email, e altre piccole funzionalit&agrave; di aiuto che dipendono dalla funzionalit&agrave; di invio email.

## Ok, allora come lo faccio? <a id="how-to"></a>

La prima cosa di cui avrai bisogno &egrave; un account con un servizio di invio email. Noi raccomandiamo fortemente Mailgun. Hanno un simpatico account starter gratuito che ti permette di inviare pi&ugrave; email rispetto agli altri ma il pi&ugrave; fecondo sistema di gestione per sottoscrizione via email che un blog possa gestire. Puoi anche usare Gmail o Amazon SES.

Appena hai deciso quale servizio email utilizzare, avrai bisogno di aggiungere le tue impostazioni al file di configurazione di Ghost. Dopo aver installato Ghost, dovresti trovare un file <code class="path">config.js</code> nella cartella principale, insieme al file <code class="path">index.js</code>. Se non hai ancora un file <code class="path">config.js</code>, copia il file <code class="path">config.example.js</code> e rinominalo.

### Mailgun <a id="mailgun"></a>

Vai su [mailgun.com](http://www.mailgun.com/) e registra un account. Avrai bisogno di un indirizzo email, e ti verr&agrave; chiesto di fornire un nome di dominio, or un sottodominio. Puoi cambiarlo successivamente, quindi perch&egrave; non registrare un sottodominio simile al nome del blog che stai impostando.

Verifica il tuo indirizzo email con Mailgun, e dopo avrai accesso al loro adorabile pannello di controllo. Troverai il tuo nuovo nome utente e password che Mailgun ha creato per te (non sono gli stessi con cui ti sei registrato), cliccando sul tuo dominio sulla destra… guarda il breve video seguente, ti aiuter&agrave; a trovare questi dati.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Dati Mailgun" width="100%" />   

Esatto, adesso hai tutto ci&ograve; di cui hai bisogno. &Egrave; ora di aprire il tuo file di configurazione. Apri il file <code class="path">config.js</code> nel tuo editor preferito. Raggiungi l'ambiente che vuoi utilizzare per configurare la tua email, e modifica le tue impostazioni email cos&igrave;:

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

Inserisci il tuo 'Login' di mailgun tra gli apici dopo 'user' e la tua 'Password' di mailgun all'interno degli apici dopo 'pass'. Se stessi configurado mailgun con l'account 'tryghosttest', sarebbe come questo:

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

Fai attenzione ai segni quali due punti, apici e parentesi graffe. Se sposti o dimentichi uno di questo riceverai strani errori.

Puoi riutilizzare le tue impostazioni per entrambi gli ambienti development e production se li hai entrambi.

### Amazon SES <a id="ses"></a>

You registrare un account di Amazon Simple Email Service a <http://aws.amazon.com/ses/>. Appena l'avrai fatto, riceverai una chiave di accesso e una chiave segreta.

Apri il file di configurazione di Ghost, <code class="path">config.js</code>, nel tuo editor preferito. Raggiungi l'ambiente in cui vuoi configurare la tua email, ed aggiungi le credenziali di Amazon come mostrato qui:

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

&Egrave possibile utilizzare Gmail per inviare emial da Ghost. Se vuoi farlo, ti consigliamo di [creare un nuovo account](https://accounts.google.com/SignUp) per questo scopo, invece di utilizzare il tuo account personale.

Appena avrai creato un nuovo account, puoi configurare il file di configurazione di Ghost, <code class="path">config.js</code>. Apri il file nel tuo editor preferito. Raggiungi l'ambiente in cui vuoi configurare la tua email, e configuralo come mostrato qui:

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

Di default, l'indirizzo `from` utilizzato da Ghost sar&agrave; impostato con l'indirizzo email che trovi nella pagina di impostazioni generali. Se vuoi cambiarlo, puoi configurarlo nel file <code class="path">config.js</code>:

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
