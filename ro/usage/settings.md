---
lang: ro
layout: usage
meta_title: Cum să folosești Ghost - Documentație Ghost
meta_description: Un ghid comprehensiv pentru utilizarea platformei de blogging Ghost. Ai instalat Ghost, dar nu știi cum să-l folosești? Începe aici!
heading: Using Ghost
subheading: Rulează Ghost cum vrei, în câțiva pași simpli
chapter: usage
section: settings
permalink: /ro/usage/settings/
prev_section: configuration
next_section: managing
---

##  Setări Ghost <a id="settings"></a>

Du-te la <code class="path">&lt;URLul tău&gt;/ghost/settings/</code>.

După ce ai ajustat setările, *trebuie* să apeși pe "Save" pentru a le salva.

Poți verifica setările vizitându-ți blogul.

### Setările Blogului (<code class="path">/general/</code>)

Acestea sunt setările specifice pentru Blog.

*   **Blog Title**: Schimbă titlul blogului. Referința în temă: `@blog.title`.
*   **Blog Description**: Schimbă descrierea blogului. Referința în temă: `@blog.description`.
*   **Blog Logo**: Uploadează o poză pentru logoul blogului în format '.png', '.jpg' sau '.gif'. Referința în temă: `@blog.logo`.
*   **Blog Cover**: Încarcă coverul blogului în format '.png', '.jpg' sau '.gif'. Referința în temă: `@blog.cover`.
*   **Email Address**: Aici vor fi trimise mesajele către administrator. *Trebuie* să fie o adresă validă.
*   **Posts per page**: Numărul de articole afișate pe o pagină. Valoare numerică.
*   **Theme**: O listă a temelor disponibile aflate în directorul <code class="path">content/themes</code>. Selectarea unei teme va schimba aspectul blogului.

### Setări utilizatori (<code class="path">/user/</code>)

Setările contului de utilizator(autor).

*   **Your Name**: Numele care va apărea lângă articolele scrise de tine. Referința în temă: (post) `author.name`.
*   **Cover Image**: Coverul profilului tău în format '.png', '.jpg' sau '.gif'. Referința în temă: (post) `author.cover`.
*   **Display Picture**: Poza profilului în format '.png', '.jpg' sau '.gif' . Referința în temă: (post) `author.image`.
*   **Email Address**: Emailul tău public, și locul unde vei primii notificări. Referința în temă: (post) `author.email`.
*   **Location**: Locația ta curentă. Referința în temă: (post) `author.location`.
*   **Website**: URLul websiteului, sau orice URL dorești. Referința în temă: (post) `author.website`.
*   **Bio**: O scurtă(< 200 caractere) descriere despre tine. Referința în temă: (post) `author.bio`.

#### Schimbarea parolei

1.  Completează câmpurile necesare cu parola dorită
2.  Click pe "Change Password"
<p class="note">
    <strong>Note:</strong> Pentru ca parola să fie schimbată trebuie să dau click pe "Change Password", click pe "Save" nu va avea efect asupra parolei.
</p>

