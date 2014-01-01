---
lang: ro
layout: usage
meta_title: Cum să folosești Ghost - Documentație Ghost
meta_description: Un ghid comprehensiv pentru utilizarea platformei de blogging Ghost. Ai instalat Ghost, dar nu știi cum să-l folosești? Începe aici!
heading: Using Ghost
subheading: Rulează Ghost cum vrei, în câțiva pași simpli
chapter: usage
section: writing
permalink: /ro/usage/writing/
prev_section: managing
next_section: faq
---

##  Despre scrierea articolelor <a id="writing"></a>

Articolele sunt compuse în Ghost folosind Marjdown. Markdown are sintaxă minimală pentru marcarea documentelor cu formatare cum ar fi punctuația și caracterele speciale. Este o sintaxă construită să prevină întreruperile din flow-ul scrierii, lăsând utilizatorii să se concentreze pe conținut, și nu pe felul în care arată.

###  Ghid Markdown <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/) este un limbaj de markup conceput pentru a îmbunătății eficiența cu care scrii, ținând procesul de scriere cât mai ușor de citit.

Ghost folosește toate scurtăturile standard din Markdown, plus câteva adiții puse de noi. Lista de scurtături este transcrisă mai jos.

####  Headere

Headerele pot fi create punând o grilă(#) înaintea textului. Numărul de grile determină nivelul headerului. Nivelele iau valori de la 1 la 6.

*   H1 : `# Header 1`
*   H2 : `## Header 2`
*   H3 : `### Header 3`
*   H4 : `#### Header 4`
*   H5 : `##### Header 5`
*   H6 : `###### Header 6`

####  Stilizarea textului

*   Linkuri : `[Titlu](URL)`
*   Îngroșat : `**Îngroșat**`
*   Italic : `*Italic*`
*   Paragrafe : O linie în plus între paragrafe diferite.
*   Liste : `* Un asterix pentru fiecare element din listă
*   Citate : `> Citat`
*   Cod : `` `cod` ``
*   Linie orizontală : `==========`

####  Imagini

Pentru a insera o imagine în articolul tău prima dată trebuie să introduci `![]()` în panoul de editare Markdown.
Comanda generează o fereastră care îți va permite să încarci o poza.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

Acum poți să faci "drag and drop" cu orice imagine(.png, .gif, .jpg) din desktopul tău, peste fereastra de încărcare; alternativ poți interacționa cu fereastra la fel ca orice popup pentru încărcări.
Dacă preferi să incluzi un URL spre o imagine, fă click pe iconița 'link' în colțul din stânga jos al ferestrei de încărcare, apoi vei putea insera URLul.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

To title your image, all you need to do is place your title text inbetween the square brackets, e.g; `![This is a title]()`. 
Pentru a pune un titlul imaginii, tot ce trebuie să faci e să scrii textul între parantezele pătrate, de ex.: `![Titlu]()`. 

##### Eliminarea Imaginilor

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

Pentru a elimina o imagine, apasă pe iconița 'remove', în colțul din dreapta sus al imaginii curente. Asta îți va prezenta fereastra pentru încărcare pe care o vei lăsa necompletată.

