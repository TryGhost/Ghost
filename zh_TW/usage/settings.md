---
lang: zh_TW
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: Using Ghost
subheading: Finding your way around, and getting set up the way you want
chapter: usage
section: settings
permalink: /zh_TW/usage/settings/
prev_section: configuration
next_section: managing
---

##  Ghost Settings <a id="settings"></a>

Go to <code class="path">&lt;your URL&gt;/ghost/settings/</code>.

After you are finished adjusting the settings the "Save" button *must* be pressed, this will save your changes.

You can check your changes by visiting the Blog URL.

### Blog Settings (<code class="path">/general/</code>)

These are the Blog specific settings.

*   **Blog Title**: Changes your Blog's title. Theme reference `@blog.title`.
*   **Blog Description**: Changes your Blog's description. Theme reference `@blog.description`.
*   **Blog Logo**: Upload a Logo for your blog in either '.png', '.jpg' or '.gif'. Theme reference `@blog.logo`.
*   **Blog Cover**: Upload your blog cover image in either '.png', '.jpg' or '.gif'. Theme reference `@blog.cover`.
*   **Email Address**: This is the email admin notifications are sent too. It *must* be a valid email.
*   **Posts per page**: This is how many posts are displayed per page. This should be a numeric value.
*   **Theme**: This will list all the themes in your <code class="path">content/themes</code> directory. Selecting one from the dropdown will change your blog's look.

### User Settings (<code class="path">/user/</code>)

These are the settings that control your user / author profile.

*   **Your Name**: This is your name that will be used to credit you when you publish a post. Theme reference (post) `author.name`.
*   **Cover Image**: Your profile cover image is uploaded here, in either '.png', '.jpg' or '.gif' format. Theme reference (post) `author.cover`.
*   **Display Picture**: This is where you upload your personal display picture, in either '.png', '.jpg' or '.gif' format. Theme reference (post) `author.image`.
*   **Email Address**: This email will be available as your public email and also where you wish to receive notifications. Theme reference (post) `author.email`.
*   **Location**: This should be your current location. Theme reference (post) `author.location`.
*   **Website**: This is your personal website URL or even one of your social network URLs. Theme reference (post) `author.website`.
*   **Bio**: Your bio is where you can enter a 200 charater or less description about yourself. Theme reference (post) `author.bio`.

#### Changing your password

1.  Fill out the input boxes with the appropriate password (current / new password).
2.  Now click **Change Password**.
<p class="note">
    <strong>Note:</strong> For your password to change you must click the "Change Password" button, the "Save" button does not change the password.
</p>

