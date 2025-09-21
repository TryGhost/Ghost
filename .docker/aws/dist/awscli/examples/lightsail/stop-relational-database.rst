**To stop a relational database**

The following ``stop-relational-database`` example stops the specified relational database. ::

    aws lightsail stop-relational-database \
        --relational-database-name Database-1

Output::

    {
        "operations": [
            {
                "id": "cc559c19-4adb-41e4-b75b-5EXAMPLE4e61",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1571695526.29,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "StopRelationalDatabase",
                "status": "Started",
                "statusChangedAt": 1571695526.29
            }
        ]
    }
