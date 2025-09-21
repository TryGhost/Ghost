**To get the blueprints for new relational databases**

The following ``get-relational-database-blueprints`` example displays details about all of the available relational database blueprints that can be used to create new relational databases in Amazon Lightsail. ::

    aws lightsail get-relational-database-blueprints

Output::

    {
        "blueprints": [
            {
                "blueprintId": "mysql_5_6",
                "engine": "mysql",
                "engineVersion": "5.6.44",
                "engineDescription": "MySQL Community Edition",
                "engineVersionDescription": "MySQL 5.6.44",
                "isEngineDefault": false
            },
            {
                "blueprintId": "mysql_5_7",
                "engine": "mysql",
                "engineVersion": "5.7.26",
                "engineDescription": "MySQL Community Edition",
                "engineVersionDescription": "MySQL 5.7.26",
                "isEngineDefault": true
            },
            {
                "blueprintId": "mysql_8_0",
                "engine": "mysql",
                "engineVersion": "8.0.16",
                "engineDescription": "MySQL Community Edition",
                "engineVersionDescription": "MySQL 8.0.16",
                "isEngineDefault": false
            },
            {
                "blueprintId": "postgres_9_6",
                "engine": "postgres",
                "engineVersion": "9.6.15",
                "engineDescription": "PostgreSQL",
                "engineVersionDescription": "PostgreSQL 9.6.15-R1",
                "isEngineDefault": false
            },
            {
                "blueprintId": "postgres_10",
                "engine": "postgres",
                "engineVersion": "10.10",
                "engineDescription": "PostgreSQL",
                "engineVersionDescription": "PostgreSQL 10.10-R1",
                "isEngineDefault": false
            },
            {
                "blueprintId": "postgres_11",
                "engine": "postgres",
                "engineVersion": "11.5",
                "engineDescription": "PostgreSQL",
                "engineVersionDescription": "PostgreSQL 11.5-R1",
                "isEngineDefault": true
            }
        ]
    }
