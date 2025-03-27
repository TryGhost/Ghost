Steps to generate a new `vX_export.json` file:
1. `ghost install --version 3.0.0` - install a local version of Ghost using the X version
2. When prompted for blog details use following data for consistency:
  - blog URL: accept default (http://localhost:2368)
  - MySQL hostname: whatever is configured locally (localhost in my case)
  - MySQL username: whatever user is configured locally
  - MySQL password: whatever is configured locally for the user
  - Ghost database name: accept default (fresh_3_0_prod as an example)
  - "ghost" MySQL user: n (unless you need one for your local setup)
  - set up Systemd: n (no reason to set this up locally)
  - start Ghost: n (need to fix permissions first)
  - run `sudo chown -R $USER:$USER content` (this is needed for local setup as the CLI creates content folder with ghost:ghost permissions)
  - start Ghost instance: `ghost start`
3. Register with test user account with following details:
  - `Testing Export Fixtures` - Site title
  - `Fixture Ghosty` - Full name
  - {your_email}@ghost.org - Email address (I used naz@ghost.org as an example, this is to prevent spamming test@ghost.org)
  - Password - generate one (for example use 1Password to autofill it)
4. Go to Admin panels's labs page and download an export (`/settings/labs` page and "Export your content" section)
5. Format and rename exported data: `jq . testing-export-fixtures.ghost.2021-03-24-01-15-52.json > v3_export.json` (can use `vX_export.json` where X is a Ghost version number)
6. Copy the file into `/utils/fixtures/export` project folder by running e.g.: `cp ./v3_export.json ~/Ghost/test/fixtures/export/`
7. Replace email used during registration with a generic `test@ghost.org` can use following command `sed -i 's/naz@ghost.org/test@ghost.org/g' v3_export.json` (replace naz@ with an email you used and use appropriate json file name)
8. Check the tests and commit new/updated export file

Note, the export contains Ghost's default configuration with no customizations. In the future iteration it would be useful to add more custom data like users with different roles, multiple posts and pages with different sets of customizations like metadata, pictures and so on.
