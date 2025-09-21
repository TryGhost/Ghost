**Example 1: To store a new secret value in a secret**

The following ``put-secret-value`` example creates a new version of a secret with two key-value pairs. ::

    aws secretsmanager put-secret-value \
        --secret-id MyTestSecret \
        --secret-string "{\"user\":\"diegor\",\"password\":\"EXAMPLE-PASSWORD\"}"  

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-1a2b3c",
        "Name": "MyTestSecret",
        "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "VersionStages": [
            "AWSCURRENT"
        ]
    }

For more information, see `Modify a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_update-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To store a new secret value from credentials in a JSON file**

The following ``put-secret-value`` example creates a new version of a secret from credentials in a file. For more information, see `Loading AWS CLI parameters from a file <https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-parameters-file.html>`__ in the *AWS CLI User Guide*. ::

    aws secretsmanager put-secret-value \
        --secret-id MyTestSecret \
        --secret-string file://mycreds.json 

Contents of ``mycreds.json``::

    {
      "engine": "mysql",
      "username": "saanvis",
      "password": "EXAMPLE-PASSWORD",
      "host": "my-database-endpoint.us-west-2.rds.amazonaws.com",
      "dbname": "myDatabase",
      "port": "3306"
    }

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret",
        "VersionId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "VersionStages": [
            "AWSCURRENT"
        ]
    }

For more information, see `Modify a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_update-secret.html>`__ in the *Secrets Manager User Guide*.