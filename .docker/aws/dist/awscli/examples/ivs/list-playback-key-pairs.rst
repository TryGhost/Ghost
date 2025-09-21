**To get summary information about all playback key pairs**

The following ``list-playback-key-pairs`` example returns information about all key pairs. ::

    aws ivs list-playback-key-pairs

Output::

    {
        "keyPairs": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:playback-key/abcd1234efgh",
                "name": "test-key-0",
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:playback-key/ijkl5678mnop",
                "name": "test-key-1",
                "tags": {}
            }
        ]
    }

For more information, see `Setting Up Private Channels <https://docs.aws.amazon.com/ivs/latest/userguide//private-channels.html>`__ in the *Amazon Interactive Video Service User Guide*.