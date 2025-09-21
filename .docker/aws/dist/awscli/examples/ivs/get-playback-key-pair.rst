**To get a specified playback key pair**

The following ``get-playback-key-pair`` example returns the fingerprint of the specified key pair. ::

    aws ivs get-playback-key-pair \
        --arn arn:aws:ivs:us-west-2:123456789012:playback-key/abcd1234efgh

Output::

    {
        "keyPair": {
            "arn": "arn:aws:ivs:us-west-2:123456789012:playback-key/abcd1234efgh",
            "name": "my-playback-key",
            "fingerprint": "0a:1b:2c:ab:cd:ef:34:56:70:b1:b2:71:01:2a:a3:72",
            "tags": {}
        }
    }

For more information, see `Setting Up Private Channels <https://docs.aws.amazon.com/ivs/latest/userguide//private-channels.html>`__ in the *Amazon Interactive Video Service User Guide*.