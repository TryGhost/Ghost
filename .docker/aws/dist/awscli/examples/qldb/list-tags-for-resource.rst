**To list the tags attached to a ledger**

The following ``list-tags-for-resource`` example  lists all tags attached to the specified ledger. ::

    aws qldb list-tags-for-resource \
        --resource-arn arn:aws:qldb:us-west-2:123456789012:ledger/myExampleLedger

Output::

    {
        "Tags": {
            "IsTest": "true",
            "Domain": "Test"
        }
    }

For more information, see `Tagging Amazon QLDB Resources <https://docs.aws.amazon.com/qldb/latest/developerguide/tagging.html>`__ in the *Amazon QLDB Developer Guide*.
