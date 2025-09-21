**To get information about a relational database**

The following ``get-relational-database`` example displays details about the specified relational database. ::

    aws lightsail get-relational-database \
        --relational-database-name Database-1

Output::

    {
        "relationalDatabase": {
            "name": "Database-1",
            "arn": "arn:aws:lightsail:us-west-2:111122223333:RelationalDatabase/7ea932b1-b85a-4bd5-9b3e-bEXAMPLE8cc4",
            "supportCode": "6EXAMPLE3362/ls-9EXAMPLE8ad863723b62cc8901a8aa6e794ae0d2",
            "createdAt": 1571259453.795,
            "location": {
                "availabilityZone": "us-west-2a",
                "regionName": "us-west-2"
            },
            "resourceType": "RelationalDatabase",
            "tags": [],
            "relationalDatabaseBlueprintId": "mysql_8_0",
            "relationalDatabaseBundleId": "micro_1_0",
            "masterDatabaseName": "dbmaster",
            "hardware": {
                "cpuCount": 1,
                "diskSizeInGb": 40,
                "ramSizeInGb": 1.0
            },
            "state": "available",
            "backupRetentionEnabled": false,
            "pendingModifiedValues": {},
            "engine": "mysql",
            "engineVersion": "8.0.16",
            "masterUsername": "dbmasteruser",
            "parameterApplyStatus": "in-sync",
            "preferredBackupWindow": "10:01-10:31",
            "preferredMaintenanceWindow": "sat:11:14-sat:11:44",
            "publiclyAccessible": true,
            "masterEndpoint": {
                "port": 3306,
                "address": "ls-9EXAMPLE8ad863723b62ccEXAMPLEa6e794ae0d2.czowadgeezqi.us-west-2.rds.amazonaws.com"
            },
            "pendingMaintenanceActions": []
        }
    }
