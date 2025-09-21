**To restore a previously deleted secret**

The following ``restore-secret`` example restores a secret that was previously scheduled for deletion. ::

    aws secretsmanager restore-secret \
        --secret-id MyTestSecret 

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Delete a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_delete-secret.html>`__ in the *Secrets Manager User Guide*.