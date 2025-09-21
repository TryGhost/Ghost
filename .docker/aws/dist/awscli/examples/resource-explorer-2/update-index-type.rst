**To change the type of a Resource Explorer index**

The following ``update-index-type`` example converts the specified index from type ``local`` to type ``aggregator`` to turn on the ability to search for resources across all AWS Regions in the account. You must send the request to the AWS Region that contains the index you want to update. ::

    aws resource-explorer-2 update-index-type \
        --arn arn:aws:resource-explorer-2:us-east-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111 \
        --type aggregator \
        --region us-east-1

Output::

    {
        "Arn":"arn:aws:resource-explorer-2:us-east-1:123456789012:index/EXAMPLE8-90ab-cdef-fedc-EXAMPLE11111",
        "LastUpdatedAt":"2022-07-13T18:41:58.799Z",
        "State":"updating",
        "Type":"aggregator"
    }

For more information about changing an index's type, see `Turning on cross-Region search by creating an aggregator index <https://docs.aws.amazon.com/resource-explorer/latest/userguide/manage-aggregator-region.html>`__ in the *AWS Resource Explorer Users Guide*.