**To list the metrics that can be queried for a metric type on a DB instance**

The following ``list-available-resource-metrics`` example lists the ``db.load`` metrics you can query for the database ``db-abcdefg123456789``. ::

    aws pi list-available-resource-metrics \
        --service-type RDS \
        --identifier db-abcdefg123456789 \
        --metric-types "os" "db"

Output::

    {
        "Metrics": [
            {
                "Description": "The number of virtual CPUs for the DB instance",
                "Metric": "os.general.numVCPUs",
                "Unit": "vCPUs"
            },
            ......,
            {
                "Description": "Time spent reading data file blocks by backends in this instance",
                "Metric": "db.IO.read_latency",
                "Unit": "Milliseconds per block"
            },
            ......
        ]
    }

For more information about metrics in Performance Insights, see `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon RDS User Guide* and `Database load <https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_PerfInsights.Overview.ActiveSessions.html>`__ in the *Amazon Aurora User Guide*.