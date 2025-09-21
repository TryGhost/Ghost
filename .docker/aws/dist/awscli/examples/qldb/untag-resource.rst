**To remove tags from a resource**

The following ``untag-resource`` example removes tags with the specified tag keys from a specified ledger. ::

    aws qldb untag-resource \
        --resource-arn arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger \
        --tag-keys IsTest Domain

This command produces no output.

For more information, see `Tagging Amazon QLDB Resources <https://docs.aws.amazon.com/qldb/latest/developerguide/tagging.html>`__ in the *Amazon QLDB Developer Guide*.
