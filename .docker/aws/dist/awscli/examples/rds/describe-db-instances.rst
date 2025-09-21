**To describe a DB instance**

The following ``describe-db-instances`` example retrieves details about the specified DB instance. ::

    aws rds describe-db-instances \
        --db-instance-identifier mydbinstancecf

Output::

    {
        "DBInstances": [
            {
                "DBInstanceIdentifier": "mydbinstancecf",
                "DBInstanceClass": "db.t3.small",
                "Engine": "mysql",
                "DBInstanceStatus": "available",
                "MasterUsername": "masterawsuser",
                "Endpoint": {
                    "Address": "mydbinstancecf.abcexample.us-east-1.rds.amazonaws.com",
                    "Port": 3306,
                    "HostedZoneId": "Z2R2ITUGPM61AM"
                },
                ...some output truncated...
            }
        ]
    }
