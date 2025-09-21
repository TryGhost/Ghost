**Example 1: To update the description of a secret**

The following ``update-secret`` example updates the description of a secret. ::

    aws secretsmanager update-secret \
        --secret-id MyTestSecret \
        --description "This is a new description for the secret."

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Modify a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_update-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To update the encryption key associated with a secret**

The following ``update-secret`` example updates the KMS key used to encrypt the secret value. The KMS key must be in the same region as the secret. ::

    aws secretsmanager update-secret \
        --secret-id MyTestSecret \
        --kms-key-id arn:aws:kms:us-west-2:123456789012:key/EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Modify a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_update-secret.html>`__ in the *Secrets Manager User Guide*.
