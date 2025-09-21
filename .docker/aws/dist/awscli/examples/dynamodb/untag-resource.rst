**To remove a tag from a DynamoDB resource**

The following ``untag-resource`` example removes the tag with the key ``Owner`` from the ``MusicCollection`` table. ::

    aws dynamodb untag-resource \
        --resource-arn arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection \
        --tag-keys Owner


This command produces no output.

For more information, see `Tagging for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html>`__ in the *Amazon DynamoDB Developer Guide*.
