**To list existing public keys available to sign stage participant tokens**

The following ``list-public-keys`` example lists all public keys available for sigining stage participant tokens, in the AWS region where the API request is processed. ::

    aws ivs-realtime list-public-keys

Output::

    {
        "publicKeys": [
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:public-key/abcdABC1efg2",
                "name": "",
                "tags": {}
            },
            {
                "arn": "arn:aws:ivs:us-west-2:123456789012:public-key/3bcdABCDefg4",
                "name": "",
                "tags": {}
            }
        ]
    }

For more information, see `Distribute Participant Tokens <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/getting-started-distribute-tokens.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.