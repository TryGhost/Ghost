**To return all events related to DAX clusters and parameter groups**

The following ``describe-events`` example displays details of events that are related to DAX clusters and parameter groups. ::

    aws dax describe-events

Output::

    {
        "Events": [
            {
                "SourceName": "daxcluster",
                "SourceType": "CLUSTER",
                "Message": "Cluster deleted.",
                "Date": 1576702736.706
            },
            {
                "SourceName": "daxcluster",
                "SourceType": "CLUSTER",
                "Message": "Removed node daxcluster-b.",
                "Date": 1576702691.738
            },
            {
                "SourceName": "daxcluster",
                "SourceType": "CLUSTER",
                "Message": "Removed node daxcluster-a.",
                "Date": 1576702633.498
            },
            {
                "SourceName": "daxcluster",
                "SourceType": "CLUSTER",
                "Message": "Removed node daxcluster-c.",
                "Date": 1576702631.329
            },
            {
                "SourceName": "daxcluster",
                "SourceType": "CLUSTER",
                "Message": "Cluster created.",
                "Date": 1576626560.057
            }
        ]
    }

For more information, see `Managing DAX Clusters <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.cluster-management.html>`__ in the *Amazon DynamoDB Developer Guide*.
