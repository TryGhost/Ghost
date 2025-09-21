**To describe valid modifications for a DB instance**

The following ``describe-valid-db-instance-modifications`` example retrieves details about the valid modifications for the specified DB instance. ::

    aws rds describe-valid-db-instance-modifications \
        --db-instance-identifier test-instance

Output::

    {
        "ValidDBInstanceModificationsMessage": {
            "ValidProcessorFeatures": [],
            "Storage": [
                {
                    "StorageSize": [
                        {
                            "Step": 1,
                            "To": 20,
                            "From": 20
                        },
                        {
                            "Step": 1,
                            "To": 6144,
                            "From": 22
                        }
                    ],
                    "ProvisionedIops": [
                        {
                            "Step": 1,
                            "To": 0,
                            "From": 0
                        }
                    ],
                    "IopsToStorageRatio": [
                        {
                            "To": 0.0,
                            "From": 0.0
                        }
                    ],
                    "StorageType": "gp2"
                },
                {
                    "StorageSize": [
                        {
                            "Step": 1,
                            "To": 6144,
                            "From": 100
                        }
                    ],
                    "ProvisionedIops": [
                        {
                            "Step": 1,
                            "To": 40000,
                            "From": 1000
                        }
                    ],
                    "IopsToStorageRatio": [
                        {
                            "To": 50.0,
                            "From": 1.0
                        }
                    ],
                    "StorageType": "io1"
                },
                {
                    "StorageSize": [
                        {
                            "Step": 1,
                            "To": 20,
                            "From": 20
                        },
                        {
                            "Step": 1,
                            "To": 3072,
                            "From": 22
                        }
                    ],
                    "ProvisionedIops": [
                        {
                            "Step": 1,
                            "To": 0,
                            "From": 0
                        }
                    ],
                    "IopsToStorageRatio": [
                        {
                            "To": 0.0,
                            "From": 0.0
                        }
                    ],
                    "StorageType": "magnetic"
                }
            ]
        }
    }
