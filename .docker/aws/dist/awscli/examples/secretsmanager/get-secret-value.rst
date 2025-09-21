**Example 1: To retrieve the encrypted secret value of a secret**

The following ``get-secret-value`` example gets the current secret value. ::

    aws secretsmanager get-secret-value \
        --secret-id MyTestSecret

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "SecretString": "{\"user\":\"diegor\",\"password\":\"EXAMPLE-PASSWORD\"}",
        "VersionStages": [
            "AWSCURRENT"
        ],
        "CreatedDate": 1523477145.713
    }

For more information, see `Retrieve a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To retrieve the previous secret value**

The following ``get-secret-value`` example gets the previous secret value.::

    aws secretsmanager get-secret-value \
        --secret-id MyTestSecret
        --version-stage AWSPREVIOUS

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "SecretString": "{\"user\":\"diegor\",\"password\":\"PREVIOUS-EXAMPLE-PASSWORD\"}",
        "VersionStages": [
            "AWSPREVIOUS"
        ],
        "CreatedDate": 1523477145.713
    }

For more information, see `Retrieve a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets.html>`__ in the *Secrets Manager User Guide*.
