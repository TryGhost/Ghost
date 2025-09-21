**To replicate a secret to another region**

The following ``replicate-secret-to-regions`` example replicates a secret to eu-west-3. The replica is encrypted with the AWS managed key ``aws/secretsmanager``. ::

    aws secretsmanager replicate-secret-to-regions \
        --secret-id MyTestSecret \
        --add-replica-regions Region=eu-west-3

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-1a2b3c",
        "ReplicationStatus": [
            {
                "Region": "eu-west-3",
                "KmsKeyId": "alias/aws/secretsmanager",
                "Status": "InProgress"
            }
        ]
    }

For more information, see `Replicate a secret to another Region <https://docs.aws.amazon.com/secretsmanager/latest/userguide/replicate-existing-secret.html>`__ in the *Secrets Manager User Guide*.