# Secrets

## Usage in Files

- Secret syntax: `{{ tb_secret("SECRET_NAME", "DEFAULT_VALUE_OPTIONAL") }}`.
- Use secrets for credentials in connections and pipe SQL.
- Secrets in pipe files do not allow default values.
- Secrets in connection files may include default values.
- Do not replace secrets with dynamic parameters when secrets are required.

## CLI: tb secret

- List secrets:
  - `tb secret ls`
  - `tb secret ls --match _test`

- Set or update a secret:
  - `tb secret set SECRET_NAME SECRET_VALUE`
  - `tb secret set SECRET_NAME` (prompts securely)
  - `tb secret set SECRET_NAME --multiline` (opens editor)

- Remove a secret:
  - `tb secret rm SECRET_NAME`

## Local Secrets

- If a `.env.local` file is present, its secrets are loaded automatically in Tinybird Local.
