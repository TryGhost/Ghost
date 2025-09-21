**To create a snapshot of a managed database**

The following ``create-relational-database-snapshot`` example creates a snapshot of the specified managed database. ::

    aws lightsail create-relational-database-snapshot \
        --relational-database-name Database1 \
        --relational-database-snapshot-name RelationalDatabaseSnapshot1

Output::

    {
        "operations": [
            {
                "id": "853667fb-ea91-4c02-8d20-8fc5fd43b9eb",
                "resourceName": "RelationalDatabaseSnapshot1",
                "resourceType": "RelationalDatabaseSnapshot",
                "createdAt": 1569868074.645,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "Database1",
                "operationType": "CreateRelationalDatabaseSnapshot",
                "status": "Started",
                "statusChangedAt": 1569868074.645
            },
            {
                "id": "fbafa521-3cac-4be8-9773-1c143780b239",
                "resourceName": "Database1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1569868074.645,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "RelationalDatabaseSnapshot1",
                "operationType": "CreateRelationalDatabaseSnapshot",
                "status": "Started",
                "statusChangedAt": 1569868074.645
            }
        ]
    }
