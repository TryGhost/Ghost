**Example 1: To list the secrets in your account**

The following ``list-secrets`` example gets a list of the secrets in your account. ::

    aws secretsmanager list-secrets

Output::

    {
        "SecretList": [
            {
                "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
                "Name": "MyTestSecret",
                "LastChangedDate": 1523477145.729,
                "SecretVersionsToStages": {
                    "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111": [
                        "AWSCURRENT"
                    ]
                }
            },
            {
                "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:AnotherSecret-d4e5f6",
                "Name": "AnotherSecret",
                "LastChangedDate": 1523482025.685,
                "SecretVersionsToStages": {
                    "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222": [
                        "AWSCURRENT"
                    ]
                }
            }
        ]
    }

For more information, see `Find a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_search-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 2: To filter the list of secrets in your account**

The following ``list-secrets`` example gets a list of the secrets in your account that have ``Test`` in the name. Filtering by name is case sensitive. ::

    aws secretsmanager list-secrets \
        --filter Key="name",Values="Test" 

Output::

    {
        "SecretList": [
            {
                "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
                "Name": "MyTestSecret",
                "LastChangedDate": 1523477145.729,
                "SecretVersionsToStages": {
                    "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111": [
                        "AWSCURRENT"
                    ]
                }
            }
        ]
    }

For more information, see `Find a secret <https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_search-secret.html>`__ in the *Secrets Manager User Guide*.

**Example 3: To list the secrets in your account managed by another service**

The following ``list-secrets`` example returns the secrets in your account that are managed by Amazon RDS. ::

    aws secretsmanager list-secrets \
        --filter Key="owning-service",Values="rds"

Output::

    {
        "SecretList": [
            {
                "Name": "rds!cluster-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111", 
                "Tags": [
                    {
                        "Value": "arn:aws:rds:us-west-2:123456789012:cluster:database-1", 
                        "Key": "aws:rds:primaryDBClusterArn"
                    }, 
                    {
                        "Value": "rds", 
                        "Key": "aws:secretsmanager:owningService"
                    }
                ], 
                "RotationRules": {
                    "AutomaticallyAfterDays": 1
                }, 
                "LastChangedDate": 1673477781.275, 
                "LastRotatedDate": 1673477781.26, 
                "SecretVersionsToStages": {
                    "a1b2c3d4-5678-90ab-cdef-EXAMPLEaaaaa": [
                        "AWSPREVIOUS"
                    ], 
                    "a1b2c3d4-5678-90ab-cdef-EXAMPLEbbbbb": [
                        "AWSCURRENT", 
                        "AWSPENDING"
                    ]
                }, 
                "OwningService": "rds", 
                "RotationEnabled": true, 
                "CreatedDate": 1673467300.7, 
                "LastAccessedDate": 1673395200.0, 
                "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:rds!cluster-a1b2c3d4-5678-90ab-cdef-EXAMPLE11111-a1b2c3", 
                "Description": "Secret associated with primary RDS DB cluster: arn:aws:rds:us-west-2:123456789012:cluster:database-1"
            }
        ]
    }

For more information, see `Secrets managed by other services <https://docs.aws.amazon.com/secretsmanager/latest/userguide/service-linked-secrets.html>`__ in the *Secrets Manager User Guide*.