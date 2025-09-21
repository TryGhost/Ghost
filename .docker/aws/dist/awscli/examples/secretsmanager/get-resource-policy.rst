**To retrieve the resource-based policy attached to a secret**

The following ``get-resource-policy`` example retrieves the resource-based policy attached to a secret. ::

    aws secretsmanager get-resource-policy \
        --secret-id MyTestSecret

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "ResourcePolicy": "{\n\"Version\":\"2012-10-17\",\n\"Statement\":[{\n\"Effect\":\"Allow\",\n
        \"Principal\":{\n\"AWS\":\"arn:aws:iam::123456789012:root\"\n},\n\"Action\":
        \"secretsmanager:GetSecretValue\",\n\"Resource\":\"*\"\n}]\n}"
    }

For more information, see `Authentication and access control <https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access.html>`__ in the *Secrets Manager User Guide*.