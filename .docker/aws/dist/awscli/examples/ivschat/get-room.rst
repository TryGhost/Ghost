**To get the specified room**

The following ``get-room`` example gets information about the specified room. ::

    aws ivschat get-room \
        --identifier "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6"

Output::

    {
        "arn": "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6",
        "createTime": "2022-03-16T04:44:09+00:00",
        "id": "g1H2I3j4k5L6",
        "loggingConfigurationIdentifiers": ["arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ"],
        "maximumMessageLength": 256,
        "maximumMessageRatePerSecond": 5,
        "name": "test-room-1",
        "tags": {},
        "updateTime": "2022-03-16T07:22:09+00:00"
    }

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.