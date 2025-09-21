**To tag a ledger**

The following ``tag-resource`` example adds a set of tags to a specified ledger. ::

    aws qldb tag-resource \
        --resource-arn arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger \
        --tags IsTest=true,Domain=Test

This command produces no output.

For more information, see `Tagging Amazon QLDB Resources <https://docs.aws.amazon.com/qldb/latest/developerguide/tagging.html>`__ in the *Amazon QLDB Developer Guide*.
