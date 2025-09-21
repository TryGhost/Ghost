**Example 1: To delete a secret**

The following ``delete-secret`` example deletes a secret. You can recover the secret with ``restore-secret`` until the date and time in the ``DeletionDate`` response field. To delete a secret that is replicated to other regions, first remove its replicas with ``remove-regions-from-replication``, and then call ``delete-secret``. ::

    aws secretsmanager delete-secret \
        --secret-id MyTestSecret \
        --recovery-window-in-days 7

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "DeletionDate": 1524085349.095
    }

For more information, see `Delete a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_delete-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To delete a secret immediately**

The following ``delete-secret`` example deletes a secret immediately without a recovery window. You can't recover this secret. ::

    aws secretsmanager delete-secret \
        --secret-id MyTestSecret \
        --force-delete-without-recovery

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "DeletionDate": 1508750180.309
    }

For more information, see `Delete a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_delete-secret.html>`__ in the *Secrets Manager User Guide*.