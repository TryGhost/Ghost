**To reboot a relational database**

The following ``reboot-relational-database`` example reboots the specified relational database. ::

    aws lightsail reboot-relational-database \
        --relational-database-name Database-1

Output::

    {
        "operations": [
            {
                "id": "e4c980c0-3137-496c-9c91-1EXAMPLEdec2",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1571694532.91,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationDetails": "",
                "operationType": "RebootRelationalDatabase",
                "status": "Started",
                "statusChangedAt": 1571694532.91
            }
        ]
    }
