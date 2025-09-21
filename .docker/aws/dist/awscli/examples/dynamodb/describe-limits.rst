**To view provisioned-capacity limits**

The following ``describe-limits`` example displays provisioned-capacity limits for your account in the current AWS Region. ::

    aws dynamodb describe-limits

Output::

    {
        "AccountMaxReadCapacityUnits": 80000,
        "AccountMaxWriteCapacityUnits": 80000,
        "TableMaxReadCapacityUnits": 40000,
        "TableMaxWriteCapacityUnits": 40000
    }

For more information, see `Limits in DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html>`__ in the *Amazon DynamoDB Developer Guide*.
