**To list the AWS Regions where Resource Explorer has indexes**

The following ``list-indexes`` example lists the indexes for all Regions where Resource Explorer has an index. The response specifies the type of each index, its AWS Region, and its ARN. ::

    aws resource-explorer-2 list-indexes

Output::

    {
        "Indexes": [
            {
                "Arn": "arn:aws:resource-explorer-2:us-west-2:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111",
                "Region": "us-west-2",
                "Type": "AGGREGATOR"
            },
            {
                "Arn": "arn:aws:resource-explorer-2:us-east-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222",
                "Region": "us-east-1",
                "Type": "LOCAL"
            },
            {
                "Arn": "arn:aws:resource-explorer-2:us-east-2:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE33333",
                "Region": "us-east-2",
                "Type": "LOCAL"
            },
            {
                "Arn": "arn:aws:resource-explorer-2:us-west-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE44444",
                "Region": "us-west-1",
                "Type": "LOCAL"
            }
        ]
    }

For more information about indexes, see `Checking which AWS Regions have Resource Explorer turned on <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-service-check.html>`__ in the *AWS Resource Explorer Users Guide*.