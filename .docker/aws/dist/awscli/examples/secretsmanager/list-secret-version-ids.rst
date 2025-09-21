**To list all of the secret versions associated with a secret**

The following ``list-secret-version-ids`` example gets a list of all of the versions of a secret. ::

    aws secretsmanager list-secret-version-ids \
        --secret-id MyTestSecret

Output::

    {
      "Versions": [
        {
            "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "VersionStages": [
                "AWSPREVIOUS"
            ],
            "LastAccessedDate": 1523477145.713,
            "CreatedDate": 1523477145.713
        },
        {
            "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "VersionStages": [
                "AWSCURRENT"
            ],
            "LastAccessedDate": 1523477145.713,
            "CreatedDate": 1523486221.391
        },
        {
            "CreatedDate": 1.51197446236E9,
            "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333;"
        }
        ],
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Version <https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version>`__ in the *Secrets Manager User Guide*.