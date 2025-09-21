**To list the dimensions that can be queried for a metric type on a DB instance**

The following ``list-available-resource-dimensions`` example lists the ``db.load`` metrics you can query for the database ``db-abcdefg123456789``. ::

    aws pi list-available-resource-dimensions \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --metrics db.load

Output::

    {
        "MetricDimensions": [
            {
                "Metric": "db.load",
                "Groups": [
                    {
                        "Group": "db.user",
                        "Dimensions": [
                            {
                                "Identifier": "db.user.id"
                            },
                            {
                                "Identifier": "db.user.name"
                            }
                        ]
                    },
                    {
                        "Group": "db.sql_tokenized",
                        "Dimensions": [
                            {
                                "Identifier": "db.sql_tokenized.id"
                            },
                            {
                                "Identifier": "db.sql_tokenized.db_id"
                            },
                            {
                                "Identifier": "db.sql_tokenized.statement"
                            }
                        ]
                    },
                    ...
                ]
            }
        ]
    }

For more information about dimensions in Performance Insights, see `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon RDS User Guide* and `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon Aurora User Guide*.