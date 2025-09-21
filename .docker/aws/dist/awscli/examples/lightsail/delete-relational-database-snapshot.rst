**To delete a snapshot of a managed database**

The following ``delete-relational-database-snapshot`` example deletes the specified snapshot of a managed database. ::

    aws lightsail delete-relational-database-snapshot \
        --relational-database-snapshot-name Database-Oregon-1-1566839359

Output::

    {
        "operations": [
            {
                "id": "b99acae8-735b-4823-922f-30af580e3729",
                "resourceName": "Database-Oregon-1-1566839359",
                "resourceType": "RelationalDatabaseSnapshot",
                "createdAt": 1569875293.58,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "isTerminal": true,
                "operationType": "DeleteRelationalDatabaseSnapshot",
                "status": "Succeeded",
                "statusChangedAt": 1569875293.58
            }
        ]
    }
