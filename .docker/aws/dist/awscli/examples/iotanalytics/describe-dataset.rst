**To retrieve information about a dataset**

The following ``describe-dataset`` example displays details for the specified dataset. ::

    aws iotanalytics describe-dataset \
        --dataset-name mydataset

Output::

    {
        "dataset": {
            "status": "ACTIVE",
            "contentDeliveryRules": [],
            "name": "mydataset",
            "lastUpdateTime": 1557859240.658,
            "triggers": [],
            "creationTime": 1557859240.658,
            "actions": [
                {
                    "actionName": "query_32",
                    "queryAction": {
                        "sqlQuery": "SELECT * FROM mydatastore",
                        "filters": []
                    }
                }
            ],
            "retentionPeriod": {
                "numberOfDays": 90,
                "unlimited": false
            },
            "arn": "arn:aws:iotanalytics:us-west-2:123456789012:dataset/mydataset"
        }
    }

For more information, see `DescribeDataset <https://docs.aws.amazon.com/iotanalytics/latest/APIReference/API_DescribeDataset.html>`__ in the *AWS IoT Analytics API Reference*.
