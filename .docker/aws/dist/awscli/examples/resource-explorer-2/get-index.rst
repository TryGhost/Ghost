**Example 1: To retrieve the details for a Resource Explorer aggregator index**

The following ``get-index`` example displays the details for the Resource Explorer index in the specified AWS Region. Because the specified Region contains the aggregator index for the account, the output lists the Regions that replicate data into this Region's index. ::

    aws resource-explorer-2 get-index \
        --region us-east-1

Output::

    {
        "Arn": "arn:aws:resource-explorer-2:us-east-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111",
        "CreatedAt": "2022-07-12T18:59:10.503000+00:00",
        "LastUpdatedAt": "2022-07-13T18:41:58.799000+00:00",
        "ReplicatingFrom": [
            "ap-south-1",
            "us-west-2"
        ],
        "State": "ACTIVE",
        "Tags": {},
        "Type": "AGGREGATOR"
    }

**Example 2: To retrieve the details for a Resource Explorer local index**

The following ``get-index`` example displays the details for the Resource Explorer index in the specified AWS Region. Because the specified Region contains a local index, the output lists the Region to which it replicates data from this Region's index. ::

    aws resource-explorer-2 get-index \
        --region us-west-2

Output::

    {
        "Arn": "arn:aws:resource-explorer-2:us-west-2:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE22222",
        "CreatedAt": "2022-07-12T18:59:10.503000+00:00",
        "LastUpdatedAt": "2022-07-13T18:41:58.799000+00:00",
        "ReplicatingTo": [
            "us-west-2"
        ],
        "State": "ACTIVE",
        "Tags": {},
        "Type": "LOCAL"
    }

For more information about indexes, see `Checking which AWS Regions have Resource Explorer turned on <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-service-check.html>`__ in the *AWS Resource Explorer Users Guide*.