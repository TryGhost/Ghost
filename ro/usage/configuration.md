---
lang: ro
layout: usage
meta_title: Cum să folosești Ghost - Documentație Ghost
meta_description: Un ghid comprehensiv pentru utilizarea platformei de blogging Ghost. Ai instalat Ghost, dar nu știi cum să-l folosești? Începe aici!
heading: Cum se lucrează cu Ghost
subheading: Modifică Ghost pentru a se plia nevoilor tale
chapter: usage
section: configuration
permalink: /ro/usage/configuration/
prev_section: usage
next_section: settings
---


## Configurează Ghost <a id="configuration"></a>

După ce rulezi Ghost pentru prima dată vei găsi două fișiere -  `config.js` și `index.js` în directorul unde Ghost e instalat. Primul fișier îți permite să configurezi baza de date, URLuri personalizate sau setări pentru mail.

Dacă nu ai rulat Ghost pentru prima dată, nu vei avea acest fișier. Pentru a-l creea, copiază și redenumește `config.example.js` în `config.js`.

Pentru a configura opțiunile descrise mai sus, deschide `config.js` și schimbă setările în mediul adecvat. Dacă nu ești familiar cu conceptul de mediu, citește documentația de mai jos.

## Despre medii <a id="environments"></a>

Node.js și prin extensie Ghost, are conceptul de mediu încorporat. Mediile permit crearea a diverse configurații pentru moduri diferite de operare. Ghost are două medii preconfigurate: **development** și **production**.

Sunt câteva diferențe subtile între cele două medii. **Development** este construit pentru dezvoltarea și depanarea Ghost. **Production** e construit pentru utilizarea publică a Ghost. Diferențele includ lucruri ca ce jurnale și ce eror sunt printate, precum și câte obiecte statice sunt concatenate și minimizate. În producție vei avea un singur fișier JavaScript conținân tot codul pentru interfața administratorului, în timp ce în **development** vor fi prezente mai multe.

Pe parcursul dezvoltării Ghost aceste diferențe vor crește și vor deveni mai aparente, de aceea este foarte important ca orice blog public să ruleze în mediul **production**. Dece există modul **development**? Ghost are acest mediu setat ca inițial pentru că este mai potrivit pentru găsirea și depanarea bugurilor, proces prin care vei trece prima dată când configurezi Ghost.

##  Utilizarea Mediilor <a id="using-env"></a>

Pentru a rula Ghost în alt mediu trebuie să utilizezi o variabilă de mediu. De exemplu, dacă de obicei pornești Ghost cu `node index.js`, ai folosi:

`NODE_ENV=production node index.js`

Sau dacă de obicei folosești <code>forever</code>:

`NODE_ENV=production forever start index.js`

Sau dacă ești obișnuit să folosești `npm`, poți folosi comanda mai ușor de ținut minte:

`npm start --production`

### De ce să folosesc `npm install --production`?

Am fost întrebați asta de câteva ori de ce, dacă Ghost pornește în mediul de dezvoltare automat, documentația de instalare ne spune să rulăm Ghost cu `npm install --production`? E o întrebare bună. Dacă nu incluzi `--production` când instalezi Ghost nimic rău nu se va întâmpla, dar vor fi instalate multe pachete care nu sunt utile decât oamenilor ce vor să lucreze la motorul ce face Ghost să meargă.  De asemenea vei avea nevoie de `grunt-cli` ce poate fi instalat cu `npm install -g grunt-cli`; e un pas în plus de care nu e nevoie pentru a rula Ghost ca un blog.