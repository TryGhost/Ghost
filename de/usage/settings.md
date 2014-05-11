---
lang: de
layout: usage
meta_title: Wie man Ghost benutzt - Ghost-Dokumentation
meta_description: Eine ausführliche Anleitung zum Benutzen der Ghost Blogging-Platform. Du hast Ghost, weißt aber nicht wie du loslegst? Beginne hier!
heading: Ghost benutzen
subheading: Dich zurechtfinden und alles so einstellen, wie du es willst
chapter: usage
section: settings
permalink: /de/usage/settings/
prev_section: configuration
next_section: managing
---

##  Ghost Einstellungen <a id="settings"></a>

Gehe zu <code class="path">&lt;deine URL&gt;/ghost/settings/</code>.

Nachdem du mit dem Anpassen der Einstellungen fertig bist, *musst* du den "Save"-Button anklicken, das speichert deine Änderungen.

Du kannst deine Änderungen ansehen, indem du deine Blog-URL besuchst.

### Blog Einstellungen (<code class="path">/general/</code>)

Dies sind die Blog spezifischen Einstellungen.

*   **Blog Title**: Ändert den Titel deines Blogs. Theme reference `@blog.title`.
*   **Blog Description**: Ändert die Beschreibung deines Blogs. Theme reference `@blog.description`.
*   **Blog Logo**: Lade ein Logo für deinen Blog hoch, entweder in '.png'-, '.jpg'- oder '.gif'-Format. Theme reference `@blog.logo`.
*   **Blog Cover**: Lade ein Cover für deinen Blog hoch, entweder in '.png'-, '.jpg'- oder '.gif'-Format. Theme reference `@blog.cover`.
*   **Email Address**: Das ist die E-Mailadresse, an die Admin-Benachrichtigungen gesendet werden. Es *muss* eine gültige E-Mailadresse sein.
*   **Posts per page**: Das ist die Anzahl der Posts, die pro Seite angezeigt werden.
*   **Theme**: Das listet alle Themes aus deinem <code class="path">content/themes</code>-Verzeichnis auf. Das Auswählen ändert das Aussehen deines Blogs.

### Benutzereinstellungen (<code class="path">/user/</code>)

Dies sind die Einstellungen, die dein Benutzer-/Autorprofil kontrollieren.

*   **Your Name**: Das ist dein Name, der angezeigt wird, wenn du einen Post veröffentlichst. Theme reference (post) `author.name`.
*   **Cover Image**: Du lädst hier dein Profilcoverbild hoch, entweder in '.png'-, '.jpg'- oder '.gif'-Format. Theme reference (post) `author.cover`.
*   **Display Picture**: Hier lädst du dein Anzeigebild hoch, entweder in '.png'-, '.jpg'- oder '.gif'-Format. Theme reference (post) `author.image`.
*   **Email Address**: Diese E-Mailadresse wird als deine öffentliche E-Mailadresse zur Verfügung stehen und ist auch die, mit der du Benachrichtigungen erhältst. Theme reference (post) `author.email`.
*   **Location**: Das sollte dein derzeitiger Aufenthaltsort sein. Theme reference (post) `author.location`.
*   **Website**: Das ist die URL deiner persönlichen Website oder sogar zu einem deiner sozialen Netzwerke. Theme reference (post) `author.website`.
*   **Bio**: In deiner Bio(grafie) kannst du dich in 200 Zeichen oder weniger kurz beschreiben. Theme reference (post) `author.bio`.

#### Ändern deines Passworts

1.  Fülle die Eingabefelder mit den entsprechenden Passwörtern aus. (aktuelles/neues Passwort).
2.  Klicke nun **Change Password**.
<p class="note">
    <strong>Notiz:</strong> Um dein Passwort zu ändern, musst du den "Change Password"-Button anklicken, der "Save"-Button ändert dein Passwort nicht.
</p>

