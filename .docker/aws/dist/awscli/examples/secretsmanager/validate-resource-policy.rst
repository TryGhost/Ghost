**To validate a resource policy**

The following ``validate-resource-policy`` example checks that a resource policy doesn't grant broad access to a secret. The policy is read from a file on disk. For more information, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>`__ in the *AWS CLI User Guide*. ::

    aws secretsmanager validate-resource-policy \
        --resource-policy file://mypolicy.json

Contents of ``mypolicy.json``::

    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::123456789012:role/MyRole"
                },
                "Action": "secretsmanager:GetSecretValue",
                "Resource": "*"
            }
        ]
    }

Output::

    {
        "PolicyValidationPassed": true,
        "ValidationErrors": []
    }

For more information, see `Permissions reference for Secrets Manager <https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html>`__ in the *Secrets Manager User Guide*.