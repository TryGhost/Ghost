**To delete a managed database**

The following ``delete-relational-database`` example deletes the specified managed database. ::

    aws lightsail delete-relational-database \
        --relational-database-name Database-1

Output::

    {
        "operations": [
            {
                "id": "3b0c41c1-053d-46f0-92a3-14f76141dc86",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1569875210.999,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "DeleteRelationalDatabase",
                "status": "Started",
                "statusChangedAt": 1569875210.999
            },
            {
                "id": "01ddeae8-a87a-4a4b-a1f3-092c71bf9180",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1569875211.029,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "Database-1-FinalSnapshot-1569875210793",
                "operationType": "CreateRelationalDatabaseSnapshot",
                "status": "Started",
                "statusChangedAt": 1569875211.029
            },
            {
                "id": "74d73681-30e8-4532-974e-1f23cd3f9f73",
                "resourceName": "Database-1-FinalSnapshot-1569875210793",
                "resourceType": "RelationalDatabaseSnapshot",
                "createdAt": 1569875211.029,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "Database-1",
                "operationType": "CreateRelationalDatabaseSnapshot",
                "status": "Started",
                "statusChangedAt": 1569875211.029
            }
        ]
    }
