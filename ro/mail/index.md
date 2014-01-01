---
lang: ro
layout: mail
meta_title: Ghost Mail Configuration - Ghost Docs
meta_description: How to configure your email server and send emails with the Ghost blogging platform. Everything you need to know.
heading: Setting up Email
chapter: mail
---


## Configurarea emailului <a id="email-config"></a>

Următoarea documentație conține detalii pentru configurarea emailului în Ghost. Ghost utilizează [Nodemailer](https://github.com/andris9/Nodemailer) și documentația lor conține mai multe exemple.

### Cum? Ce?

Dacă ești obișnuit cu PHP, atunci ești obișnuit ca emailul să meargă pur și simplu. Node e puțin diferit, e nou și strălucitor, și puțin nefinisat pe alocuri.

Dar nu-ți fie frică, setarea emailului o faci o singură dată și te ajutăm să o faci!

### Dar de ce?

Momentan singurul lucru pentru care Ghost folosește emailul este pentru trimiterea unui mail cu o parolă nouă în cazul în care ai uitat-o pe cea veche, dar în viitor vom implementa subscrieri bazate prin email.

## Ok, deci cum se face? <a id="how-to"></a>

Primul lucru de care ai nevoie e creerea unui cont pentru un serviciu de email. Noi vă recomandăm Mailgun. Au un pachet de bază gratuit care ar trebui să acopere orice blog de popularitate medie. De asemenea poți folosi Gmail sau Amazon SES.

O dată ce v-ați decis ce serviciu să folosiți trebuie să adăugați setarile la configurația Ghost. Editați <code class="path">config.js</code>. Dacă nu aveți încă fișierul, copiați și redenumiți <code class="path">config.example.js</code>.

### Mailgun <a id="mailgun"></a>

Creează un cont pe [mailgun.com](http://www.mailgun.com/). Vei avea nevoie de un domeniu sau un subdomeniu. Le poți schimba mai tarziu, dar poți să te gândești la un subdomeniu similar cu numele blogului.

Verifică-ți adresa de mail cu Mailgun apoi vei avea acces la panoul lor de control. Va trebui sa găsești userul și parola pe care Mailgun le-a creat pentru tine (nu sunt aceleași cu cele cu care te-ai înregistrat). Pentru asta, da click pe numele domeniului în partea dreaptă. Vezi screencastul de mai jos pentru mai multe detalii.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />   

Acestea sunt toate informațiile de care ai nevoie pentru a seta mailul. Deschide <code class="path">config.js</code>. Navighează la mediul pentru care vrei să configurezi mailul și schimbă setările să arate ca mai jos:

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

Pune `Login` de la Mailgun între ghilimele. Puteți vedea un exemplu mai jos:

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

Atenție la virgule, apostroafe și acolade. Dacă uiți una vei întâmpina erori ciudate.

Poți refolosi setările pentru mediile development și production dacă le ai pe ambele.

### Amazon SES <a id="ses"></a>

Te poți înscrie la Amazon Simple Email Service la <http://aws.amazon.com/ses/>. O dată ce ți-ai creat contul, vei primii o cheie de acces și un secret.

Deschide <code class="path">config.js</code>. Navighează la mediul pentru care vrei să setezi mailul și adaugă credențialele ca în exemplul de mai jos:

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

E posibil să folosiți Gmail pentru a trimite mailuri din Ghost. Dacă faceți asta vă recomandăm să [creați un cont nou](https://accounts.google.com/SignUp) în favoarea utilizării mailului personal.

Odată creat contul, deschide <code class="path">config.js</code>. Navighează la mediul pentru care vrei să setezi mailul și adaugă credențialele ca în exemplul de mai jos:

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

### Câmpul From: <a id="from"></a>

Setările predefinite setează câmpul 'from' să fie același cu adresa din General Settings. Dacă vrei să suprascrii opțiunea o poți face din <code class="path">config.js</code>:

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
