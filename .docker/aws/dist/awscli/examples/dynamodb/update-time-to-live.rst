**To update Time to Live settings on a table**

The following ``update-time-to-live`` example enables Time to Live on the specified table. ::

    aws dynamodb update-time-to-live \
        --table-name MusicCollection \
        --time-to-live-specification Enabled=true,AttributeName=ttl

Output::

    {
        "TimeToLiveSpecification": {
            "Enabled": true,
            "AttributeName": "ttl"
        }
    }

For more information, see `Time to Live <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html>`__ in the *Amazon DynamoDB Developer Guide*.
