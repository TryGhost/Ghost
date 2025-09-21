**To add tags to a DynamoDB resource**

The following ``tag-resource`` example adds a tag key/value pair to the ``MusicCollection`` table. ::

    aws dynamodb tag-resource \
        --resource-arn arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection \
        --tags Key=Owner,Value=blueTeam

This command produces no output.

For more information, see `Tagging for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html>`__ in the *Amazon DynamoDB Developer Guide*.
