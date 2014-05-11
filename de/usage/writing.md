---
lang: de
layout: usage
meta_title: Wie man Ghost benutzt - Ghost-Dokumentation
meta_description: Eine ausführliche Anleitung zum Benutzen der Ghost Blogging-Platform. Du hast Ghost, weißt aber nicht wie du loslegst? Beginne hier!
heading: Ghost benutzen
subheading: Dich zurechtfinden und alles so einstellen, wie du es willst
chapter: usage
section: writing
permalink: /de/usage/writing/
prev_section: managing
next_section: faq
---

##  Posts schreiben <a id="writing"></a>

Blogposts in Ghost werden unter der Verwendung von Markdown geschrieben. Markdown ist eine minimale Syntax um Dokumente durch Formatierung durch Satz- und Sonderzeichen zu gestalten. Die Syntax beabsichtigt, Störungen des Arbeitsflusses zu verhindern, was es dir erlaubt, dich auf den Inhalt zu konzentrieren und nicht darauf, wie er aussieht.

###  Markdown Guide <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/) ist eine Markup-Sprache, gestaltet um die Leistungsfähigkeit deines Schreibens zu verbessern, während das Geschriebene so einfach zu lesen gehalten wird, wie nur möglich.

Ghost benutzt alle standardmäßigen Markdown-Kurzbefehle, plus einige unserer eigenen Ergänzungen. Die komplette Liste der Kurzbefehle ist unten aufgelistet.

####  Kopfzeilen

Kopfzeilen können durch eine Raute vor dem Titeltext gesetzt werden. Die Anzahl der Rauten vor dem Titeltext kennzeichnet die Kopftiefe. Die Kopftiefen gehen von 1-6.

*   H1 : `# Kopfzeile 1`
*   H2 : `## Kopfzeile 2`
*   H3 : `### Kopfzeile 3`
*   H4 : `#### Kopfzeile 4`
*   H5 : `##### Kopfzeile 5`
*   H6 : `###### Kopfzeile 6`

####  Textgestaltung

*   Links : `[Titel](URL)`
*   Fett : `**Fett**`
*   Kursiv : `*Kursiv*`
*   Absätze : Freie Zeile zwischen Absätzen
*   Listen : `* Ein Sternchen für jeden neuen Listenpunkt`
*   Zitate : `> Zitat`
*   Code : `` `Code` ``
*   HR : `==========`

####  Bilder

Um ein Bild in deinen Post einzufügen, musst du zuerst `![]()` in dein Markdown-Editor-Feld eingeben.
Das sollte eine Bilder-Hochlade-Box in deinem Vorschaufeld erstellen.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

Du kannst nun durch Drag & Drop jedes Bild (.png, .gif, .jpg) von deinem Desktop über die Bilder-Hochlade-Box in deinen Post einbringen oder klicke alternativ auf die Bilder-Hochlade-Box um das standardmäßige Bilder-Hochlade-Popup zu benutzen.
Wenn du lieber eine Bilder-URL einfügen würdest, klicke auf das 'Link'-Icon in der unteren linken Ecke der Bilder-Hochlade-Box, was dir dann die Möglichkeit gibt, eine Bilder-URL einzutragen.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

Um deinem Bild einen Titel zu geben brauchst du nur deinen Titeltext zwischen die eckigen Klammern platzieren, zum Beispiel; `![Das ist ein Titel]()`. 

##### Bilder entfernen

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

Um ein Bild zu entfernen klicke auf das 'Entfernen'-Icon in der oberen rechten Ecke des gerade platzierten Bildes. Das zeigt dir nun wieder eine leere Bilder-Hochlade-Box, in die du ein neues Bild einfügen kannst.

