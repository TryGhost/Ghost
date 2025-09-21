**To get information about all relational database snapshots**

The following ``get-relational-database-snapshots`` example displays details about all of the relational database snapshots in the configured AWS Region. ::

    aws lightsail get-relational-database-snapshots

Output::

    {
        "relationalDatabaseSnapshots": [
            {
                "name": "Database-1-1571350042",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:RelationalDatabaseSnapshot/0389bbad-4b85-4c3d-9861-6EXAMPLE43d2",
                "supportCode": "6EXAMPLE3362/ls-8EXAMPLE2ba7ad041451946fafc2ad19cfbd9eb2",
                "createdAt": 1571350046.238,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "RelationalDatabaseSnapshot",
                "tags": [],
                "engine": "mysql",
                "engineVersion": "8.0.16",
                "sizeInGb": 40,
                "state": "available",
                "fromRelationalDatabaseName": "Database-1",
                "fromRelationalDatabaseArn": "arn:aws:lightsail:us-west-2:111122223333:RelationalDatabase/7ea932b1-b85a-4bd5-9b3e-bEXAMPLE8cc4",
                "fromRelationalDatabaseBundleId": "micro_1_0",
                "fromRelationalDatabaseBlueprintId": "mysql_8_0"
            },
            {
                "name": "Database1-Console",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:RelationalDatabaseSnapshot/8b94136e-06ec-4b1a-a3fb-5EXAMPLEe1e9",
                "supportCode": "6EXAMPLE3362/ls-9EXAMPLE14b000d34c8d1c432734e137612d5b5c",
                "createdAt": 1571249981.025,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "RelationalDatabaseSnapshot",
                "tags": [
                    {
                        "key": "test"
                    }
                ],
                "engine": "mysql",
                "engineVersion": "5.6.44",
                "sizeInGb": 40,
                "state": "available",
                "fromRelationalDatabaseName": "Database1",
                "fromRelationalDatabaseArn": "arn:aws:lightsail:us-west-2:111122223333:RelationalDatabase/a6161cb7-4535-4f16-9dcf-8EXAMPLE3d4e",
                "fromRelationalDatabaseBundleId": "micro_1_0",
                "fromRelationalDatabaseBlueprintId": "mysql_5_6"
            }
        ]
    }
