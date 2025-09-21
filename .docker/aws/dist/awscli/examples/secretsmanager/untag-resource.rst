**To remove tags from a secret**

The following ``untag-resource`` example removes two tags from a secret. For each tag, both  key and value are removed. ::

    aws secretsmanager untag-resource \
        --secret-id MyTestSecret \
        --tag-keys '[ "FirstTag", "SecondTag"]'

This command produces no output.

For more information, see `Tag secrets <https://docs.aws.amazon.com/secretsmanager/latest/userguide/managing-secrets_tagging.html>`__ in the *Secrets Manager User Guide*.