**To start a relational database**

The following ``start-relational-database`` example starts the specified relational database. ::

    aws lightsail start-relational-database \
        --relational-database-name Database-1

Output::

    {
        "operations": [
            {
                "id": "4d5294ec-a38a-4fda-9e37-aEXAMPLE0d24",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1571695998.822,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "StartRelationalDatabase",
                "status": "Started",
                "statusChangedAt": 1571695998.822
            }
        ]
    }
