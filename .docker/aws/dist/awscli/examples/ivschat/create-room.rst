**To create a room**

The following ``create-room`` example creates a new room. ::

    aws ivschat create-room \
        --name "test-room-1" \
        --logging-configuration-identifiers "arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ" \
        --maximum-message-length 256 \
        --maximum-message-rate-per-second 5

Output::

    {
        "arn": "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6",
        "id": "g1H2I3j4k5L6",
        "createTime": "2022-03-16T04:44:09+00:00",
        "loggingConfigurationIdentifiers": ["arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ"],
        "maximumMessageLength": 256, 
        "maximumMessageRatePerSecond": 5,
        "name": "test-room-1",
        "tags": {}
        "updateTime": "2022-03-16T07:22:09+00:00"
    }

For more information, see `Step 2: Create a Chat Room <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.