**Example 1: To add a tag to a secret**

The following example shows how to attach a tag with shorthand syntax. ::

    aws secretsmanager tag-resource \
        --secret-id MyTestSecret \
        --tags Key=FirstTag,Value=FirstValue

This command produces no output.

For more information, see `Tag your secrets <https://docs.aws.amazon.com/secretsmanager/latest/userguide/managing-secrets_tagging.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To add multiple tags to a secret**

The following ``tag-resource`` example attaches two key-value tags to a secret. ::

    aws secretsmanager tag-resource \
        --secret-id MyTestSecret \
        --tags '[{"Key": "FirstTag", "Value": "FirstValue"}, {"Key": "SecondTag", "Value": "SecondValue"}]'

This command produces no output.

For more information, see `Tag secrets <https://docs.aws.amazon.com/secretsmanager/latest/userguide/managing-secrets_tagging.html>`__ in the *Secrets Manager User Guide*.