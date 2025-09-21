**To view Time to Live settings for a table**

The following ``describe-time-to-live`` example displays Time to Live settings for the ``MusicCollection`` table. ::

    aws dynamodb describe-time-to-live \
        --table-name MusicCollection

Output::

    {
        "TimeToLiveDescription": {
            "TimeToLiveStatus": "ENABLED",
            "AttributeName": "ttl"
        }
    }

For more information, see `Time to Live <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html>`__ in the *Amazon DynamoDB Developer Guide*.
