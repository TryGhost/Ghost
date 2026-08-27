# ResuAI Academy deployment

ResuAI Academy is the healthcare learning and premium exam-content publication for ResuAIBuilder.

## Recommended production topology

- Existing application: https://resuaibuilder.com (Vercel)
- Academy: https://learn.resuaibuilder.com (Railway)
- Runtime: Ghost 6 using `Dockerfile.resuai-academy`
- Database: Railway MySQL
- Persistent storage: Railway volume mounted at `/var/lib/ghost/content`
- Transactional email: Mailgun (required for newsletters; SMTP can be used for staff mail)
- Membership payments: Stripe through Ghost Portal

## Required environment variables

```
url=https://learn.resuaibuilder.com
NODE_ENV=production
database__client=mysql
database__connection__host=<mysql host>
database__connection__port=3306
database__connection__user=<mysql user>
database__connection__password=<mysql password>
database__connection__database=<mysql database>
```

Add mail variables only after obtaining the provider credentials. Do not commit credentials.

## First-run checklist

1. Open `https://<railway-domain>/ghost/` and create the owner account.
2. In Settings → Design, activate **ResuAI Academy**.
3. Set title to **ResuAI Academy** and description to **Healthcare careers, licensing and exam preparation**.
4. Add navigation: Home, Nursing, Pharmacy, GCC Licensing, Career Launchpad.
5. Create tags with slugs: `nursing`, `pharmacy`, `licensing`, `career`.
6. Configure free and paid memberships in Settings → Membership.
7. Connect Stripe only when live pricing and refund terms are approved.
8. Configure Mailgun before sending newsletters.
9. Point the `learn` CNAME in GoDaddy to the Railway-provided DNS target.
10. Replace the Railway temporary URL with `https://learn.resuaibuilder.com`.

## Suggested initial tiers

- Free: licensing updates and selected learning resources
- Exam Access: profession-specific notes and question explanations
- Career Plus: exam access plus CV, interview and job-search resources

## Safety and content rules

- Do not claim affiliation with DHA, DOH, MOHAP, Prometric or Pearson VUE.
- Do not reproduce recalled examination questions.
- Publish original questions and explanations.
- Add authority links and “last verified” dates to regulatory guidance.
- Do not publish patient-identifiable or confidential information.
