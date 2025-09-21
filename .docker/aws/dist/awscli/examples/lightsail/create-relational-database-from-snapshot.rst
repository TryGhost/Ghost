**To create a managed database from a snapshot**

The following ``create-relational-database-from-snapshot`` example creates a managed database from the specified snapshot in the specified AWS Region and Availability Zone, using the $15 USD standard database bundle.
**Note:** The bundle that you specify must be equal to or greater in specifications than the bundle of the original source database used to create the snapshot. ::

    aws lightsail create-relational-database-from-snapshot \
        --relational-database-snapshot-name Database-Oregon-1-1566839359 \
        --relational-database-name Database-1 \
        --availability-zone us-west-2a \
        --relational-database-bundle-id micro_1_0 \
        --no-publicly-accessible

Output::

    {
        "operations": [
            {
                "id": "ad6d9193-9d5c-4ea1-97ae-8fe6de600b4c",
                "resourceName": "Database-1",
                "resourceType": "RelationalDatabase",
                "createdAt": 1569867916.938,
                "location": {
                    "availabilityZone": "us-west-2a",
                    "regionName": "us-west-2"
                },
                "isTerminal": false,
                "operationType": "CreateRelationalDatabaseFromSnapshot",
                "status": "Started",
                "statusChangedAt": 1569867918.643
            }
        ]
    }
