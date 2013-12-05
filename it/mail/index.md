---
lang: it
layout: mail
meta_title: Configuratione Mail in Ghost - Documentazione Ghost Docs
meta_description: Come configurare il tuo email server ed inviare email con la piattaforma di blog Ghost. Tutto ciò che ti serve sapere.
heading: Setting up Email
chapter: mail
---


## Configurazione Mail <a id="email-config"></a>

La seguente documentazione, dettaglia come configurare le email in Ghost. Ghost utilizza [Nodemailer](https://github.com/andris9/Nodemailer), la loro documentazione contiene molti altri esempi. 

### Cosa mi aspetta?

Se hai famigliarità con PHP, allore sei probabilmente abituato ad avere l'email funzionante e settata magicamente sulla tua piattaforma. Node è leggermente differnete, non Node is a bit differente, è nuovo fiammante ed ha ancora piccole problematiche in questi ambiti.

Ma non preoccuparti, settare la tua email richiede solo un unico intervento e siamo qui per accompagnarti passo dopo passo.

### Ma perchè?

Al momento, il solo motivo per cui Ghost utilizzi le email è per mandare messaggi per la nuova password, se l'hai dimenticata. Non è molto, ma è inestimabile come sia utile questa caratteristica, qual ora servisse.

In futuro, Ghost potrebbe anche supportare impostazioni email, basate su sottoscrizione ai tuoi blog. Contattave via email nuovi utenti

In the future, Ghost will also support setting up email-based subscriptions to your blogs. Spedire dettagli dei nuovi utenti, ed altre piccole caratteristiche che dipendono dall'abilità di mandare email.

## Ok, quindi come posso fare? <a id="how-to"></a>

Per prima cosa,hai bisogno di un account con servizio di invio posta. Noi raccomandiamo caldamente Mailgun. Offrono un account iniziale semplice e gratuito con cui puoi inviare molte email rispetto a tutti quelle sottoiscrizioni via email basate su blog, che potresti gestire. Puoi anche usare Gmail o Amazon SES.

una volta che hai deciso quale servizio email usare, hai bisogno di aggiungere i parametri al file di configurazione di Ghost. In qualunque modo hai installato Ghost, dovresti trovare un file <code class="path">config.js</code> nella cartella d'installazione, vicino al file <code class="path">index.js</code>.  Se non hai ancora il file <code class="path">config.js</code>, fai una copia del file <code class="path">config.example.js</code> e rinominalo.

### Mailgun <a id="mailgun"></a>

Vai su [mailgun.com](http://www.mailgun.com/) e registrati per un account. Avrete bisogno di avere un indirizzo di posta elettronica a portata di mano, e vi chiederà di fornire anche un nome di dominio, o pensare un sottodominio.Potrai cambiarlo anche in un secondo momento, quindi per adesso perchè non registrare un sottodominio simile al nome che hai impostato al tuo blog.

Verifica il tuo indirizzo email con Mailgun, e avrai l'accesso al loro amabile pannello di controllo.

Avrai bisogno di trovare, per il servizio email, il nuovo username e password che Mailgun ha creato per te (non sono le stesse con cui ti sei registrato), cliccando sul tuo dominio, sul lato destro... guarda il piccolo screencast qui sotto per aiutarti a trovare i dettagli.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />   
  
Bene, adesso hai tutto ciò ceh ti serve, è tempo di aprire il tuo file di configurazione. Apri il tuo file <code class="path">config.js</code> in un editor di tua scelta. Naviga fino alla modalità, di cui vuoi settare l'email, e cambia le impostazioni email così:

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

Metti il tuo 'Login' da mailgun tra gli apicimcos' per 'user' e 'Password' da mailgun, all'interno delle quote, fino a 'pass'. Se hai configurato mailgun come l'account 'tryghosttest', dovre essere circa così:

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
Tieni d'occhio tutte le virgole, apici e parentesi graffe. Sbaglia una di queste e troverai strani errori.
Puoi riutilizzare le tue impostazioni per l'ambiente di sviluppo e l'ambiente di produzione, se li hai entrambi.

### Amazon SES <a id="ses"></a>

Puoi registrarti per ottenere un account 'Amazon Simple Email Service' su <http://aws.amazon.com/ses/>. Una volta finito di registrarti, ti verrà data una chiave di accesso ed una segreta.

Aptri il file di Ghost<code class="path">config.js</code> in un editor di tua scelta. Cerca l'ambiente di cui vuoi configurare l'email, e aggiunti le tue credenziali alle impostazioni email e, comaparirà circa così:

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

È possibile utilizzare Gmail per inviare email con Ghost.

Se vuoi fare cos', ti raccomandiamo di [creare un nuovo account](https://accounts.google.com/SignUp) 
per lo scopo, piuttosto che utilizzare dettagli di un account email esistente.

una volta creato il tuo nuovo account, puoi configurare le impostazioni di Ghost con il file<code class="path">config.js</code>.

Apri il file con un editor di tua scelta. Cerca l'ambiente di cui vuoi impostare l'email, e cambia le tue impostazioni cos':

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

### From Address <a id="from"></a>

Di default il campo 'Da' per mandare email da Ghost, berrà settato nell'indirizzo email della pagina impostazioni generali. Se vuoi sovvrascrivere questo con qualcosa di differente, puoi configurarlo nel file <code class="path">config.js</code>.

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
