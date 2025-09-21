**To describe orderable DB instance options**

The following ``describe-orderable-db-instance-options`` example retrieves details about the orderable options for a DB instances running the MySQL DB engine. ::

    aws rds describe-orderable-db-instance-options \
        --engine mysql

Output::

    {
        "OrderableDBInstanceOptions": [
            {
                "MinStorageSize": 5,
                "ReadReplicaCapable": true,
                "MaxStorageSize": 6144,
                "AvailabilityZones": [
                    {
                        "Name": "us-east-1a"
                    },
                    {
                        "Name": "us-east-1b"
                    },
                    {
                        "Name": "us-east-1c"
                    },
                    {
                        "Name": "us-east-1d"
                    }
                ],
                "SupportsIops": false,
                "AvailableProcessorFeatures": [],
                "MultiAZCapable": true,
                "DBInstanceClass": "db.m1.large",
                "Vpc": true,
                "StorageType": "gp2",
                "LicenseModel": "general-public-license",
                "EngineVersion": "5.5.46",
                "SupportsStorageEncryption": false,
                "SupportsEnhancedMonitoring": true,
                "Engine": "mysql",
                "SupportsIAMDatabaseAuthentication": false,
                "SupportsPerformanceInsights": false
            }
        ]
        ...some output truncated...
    }
