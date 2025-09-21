**To add a resource-based policy to a secret**

The following ``put-resource-policy`` example adds a permissions policy to a secret, checking first that the policy does not provide broad access to the secret. The policy is read from a file. For more information, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>`__ in the *AWS CLI User Guide*. ::

    aws secretsmanager put-resource-policy \
        --secret-id MyTestSecret \
        --resource-policy file://mypolicy.json \
        --block-public-policy

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
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Attach a permissions policy to a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-policies.html>`__ in the *Secrets Manager User Guide*.