**To import the public portion of a new key pair**

The following ``import-playback-key-pair`` example imports the specified public key (specified as a string in PEM format) and returns the arn and fingerprint of the new key pair. ::

    aws ivs import-playback-key-pair \
        --name "my-playback-key" \
        --public-key-material "G1lbnQxOTA3BgNVBAMMMFdoeSBhcmUgeW91IGRl..."

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