# Reporting Security Issues

If you discover a security issue in Ghost, please report it by sending an email to security@ghost.org

This will allow us to assess the risk, and make a fix available before we add a bug report to the GitHub repository.

Thanks for helping make Ghost safe for everyone.

## Triage

- We are not interested in social engineering reports
- We are not interested in HTTP sniffing or HTTP tampering exploits, our sandbox is HTTPS and you can assume all live instances will be HTTPS.
- We are not interested in anything to do with deliberate damage to a user's own site, by themselves (more below)

## XSS / Privilege escalation attacks

Ghost is a content management system and all users are considered to be privileged/trusted. A user can only obtain an account and start creating content after they have been invited by the site owner or similar adminstrator-level user.

A basic feature of Ghost as a CMS is to allow content creators to make use of scripts, SVGs, or embedded content that is required for the content to display as intended. Because of this there will always be the possibility of "XSS" attacks, albeit only from users that have been trusted to build the site's content.

Ghost's admin application does a lot to ensure that unknown scripts are not run within the the admin application itself, however that only protects one side of a Ghost site. If the front-end (the rendered site that anonymous visitors see) shares the same domain as the admin application then browsers do not offer sufficient protections to prevent successful XSS attacks by trusted users.

If you are concerned that trusted users you invite to create your site will act maliciously the best advice is to split your front-end and admin area onto different domains (e.g. https://mysite.com and https://mysiteadmin.com/ghost/). This way browsers offer greater built-in protection because credentials cannot be read across domains. Even in this case it should be understood that you are giving invited users completely free reign in content creation so absolute security guarantees do not exist.

We take any attack vector where an _untrusted_ user is able to inject malicious content very seriously and welcome any and all reports.
