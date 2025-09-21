**To get an existing public key used to sign stage participant tokens**

The following ``get-public-key`` example gets a public key specified by the provided ARN, for sigining stage participant tokens. ::

    aws ivs-realtime get-public-key \
        --arn arn:aws:ivs:us-west-2:123456789012:public-key/abcdABC1efg2

Output::

    {
        "publicKey": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:public-key/abcdABC1efg2",
            "name": "",
            "publicKeyMaterial": "-----BEGIN PUBLIC KEY-----\nMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEqVWUtqs6EktQMR1sCYmEzGvRwtaycI16\n9pmzcpiWu/uhNStGlteJ5odRfRwVkoQUMnSZXTCcbn9bBTTmiWo4mJcFOOAzsthH\n0UAb8NdD4tUE0At4a9hYP9IETEXAMPLE\n-----END PUBLIC KEY-----",
            "fingerprint": "12:a3:44:56:bc:7d:e8:9f:10:2g:34:hi:56:78:90:12",
            "tags": {}
        }
    }

For more information, see `Distribute Participant Tokens <https://docs.aws.amazon.com/ivs/latest/RealTimeUserGuide/getting-started-distribute-tokens.html>`__ in the *Amazon IVS Real-Time Streaming User Guide*.