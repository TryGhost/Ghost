**To list available Amazon DocumentDB engine versions**

The following ``describe-db-engine-versions`` example lists all available Amazon DocumentDB engine versions. ::

    aws docdb describe-db-engine-versions \
        --engine docdb

Output::

    {
        "DBEngineVersions": [
            {
                "DBEngineVersionDescription": "DocDB version 1.0.200837",
                "DBParameterGroupFamily": "docdb3.6",
                "EngineVersion": "3.6.0",
                "ValidUpgradeTarget": [],
                "DBEngineDescription": "Amazon DocumentDB (with MongoDB compatibility)",
                "SupportsLogExportsToCloudwatchLogs": true,
                "Engine": "docdb",
                "ExportableLogTypes": [
                    "audit"
                ]
            }
        ]
    }


For more information, see `DescribeDBEngineVersions <https://docs.aws.amazon.com/documentdb/latest/developerguide/API_DescribeDBEngineVersions.html>`__ in the *Amazon DocumentDB Developer Guide*.
