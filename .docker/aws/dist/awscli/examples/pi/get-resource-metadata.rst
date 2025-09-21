**To get resource metadata for a database**

The following ``get-resource-metadata`` example gets the resource metadata for the database ``db-abcdefg123456789``. The response shows that SQL digest statistics are enabled. ::

    aws pi get-resource-metadata \
        --service-type RDS \
        --identifier db-abcdefg123456789

Output::

    {    
        "Identifier": "db-abcdefg123456789",
        "Features":{
            "SQL_DIGEST_STATISTICS":{
                "Status": "ENABLED"
            }
        }
    }

For more information about SQL statistics for Performance Insights, see `SQL statistics for Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/sql-statistics.html>`__ in the *Amazon RDS User Guide* and `SQL statistics for Performance Insights <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/sql-statistics.html>`__ in the *Amazon Aurora User Guide*.