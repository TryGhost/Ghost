**To retrieve information about a data store**

The following ``describe-datastore`` example displays details, including statistics, for the specified data store. ::

    aws iotanalytics describe-datastore \
        --datastore-name mydatastore \
        --include-statistics

Output::

    {
        "datastore": {
            "status": "ACTIVE",
            "name": "mydatastore",
            "lastUpdateTime": 1557858971.02,
            "creationTime": 1557858971.02,
            "retentionPeriod": {
                "unlimited": true
            },
            "arn": "arn:aws:iotanalytics:us-west-2:123456789012:datastore/mydatastore"
        },
        "statistics": {
            "size": {
                "estimatedSizeInBytes": 397.0,
                "estimatedOn": 1561592040.0
            }
        }
    }

For more information, see `DescribeDatastore <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_DescribeDatastore.html>`__ in the *AWS IoT Analytics API Reference*.
