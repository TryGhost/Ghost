**To get summary information about all your rooms in the current region**

The following ``list-rooms`` example gets summary information about all the rooms in the AWS region where the request is processed. Results are sorted in descending order of updateTime. ::

    aws ivschat list-rooms \
        --logging-configuration-identifier "arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ" \
        --max-results 10 \
        --next-token ""

Output::

    {
        "nextToken": "page3",
        "rooms": [
            {
                "arn:aws:ivschat:us-west-2:12345689012:room/g1H2I3j4k5L6",
                "createTime": "2022-03-16T04:44:09+00:00",
                "id": "g1H2I3j4k5L6",
                "loggingConfigurationIdentifiers": ["arn:aws:ivschat:us-west-2:123456789012:logging-configuration/ABcdef34ghIJ"],
                "name": "test-room-1",
                "tags": {},
                "updateTime": "2022-03-16T07:22:09+00:00"
            }
        ]
    }

For more information, see `Getting Started with Amazon IVS Chat <https://docs.aws.amazon.com/ivs/latest/userguide/getting-started-chat.html>`__ in the *Amazon Interactive Video Service User Guide*.