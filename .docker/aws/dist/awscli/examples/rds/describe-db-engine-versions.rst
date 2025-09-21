**To describe the DB engine versions for the MySQL DB engine**

The following ``describe-db-engine-versions`` example displays details about each of the DB engine versions for the specified DB engine. ::

    aws rds describe-db-engine-versions \
        --engine mysql

Output::

    {
        "DBEngineVersions": [
            {
                "Engine": "mysql",
                "EngineVersion": "5.5.46",
                "DBParameterGroupFamily": "mysql5.5",
                "DBEngineDescription": "MySQL Community Edition",
                "DBEngineVersionDescription": "MySQL 5.5.46",
                "ValidUpgradeTarget": [
                    {
                        "Engine": "mysql",
                        "EngineVersion": "5.5.53",
                        "Description": "MySQL 5.5.53",
                        "AutoUpgrade": false,
                        "IsMajorVersionUpgrade": false
                    },
                    {
                        "Engine": "mysql",
                        "EngineVersion": "5.5.54",
                        "Description": "MySQL 5.5.54",
                        "AutoUpgrade": false,
                        "IsMajorVersionUpgrade": false
                    },
                    {
                        "Engine": "mysql",
                        "EngineVersion": "5.5.57",
                        "Description": "MySQL 5.5.57",
                        "AutoUpgrade": false,
                        "IsMajorVersionUpgrade": false
                    },
                    ...some output truncated...
                ]
            }

For more information, see `What Is Amazon Relational Database Service (Amazon RDS)? <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html>`__ in the *Amazon RDS User Guide*.
