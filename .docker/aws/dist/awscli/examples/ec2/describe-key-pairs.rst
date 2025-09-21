**To display a key pair**

The following ``describe-key-pairs`` example displays information about the specified key pair. ::

    aws ec2 describe-key-pairs \
        --key-names my-key-pair

Output::

    {
        "KeyPairs": [
            {
                "KeyPairId": "key-0b94643da6EXAMPLE",
                "KeyFingerprint": "1f:51:ae:28:bf:89:e9:d8:1f:25:5d:37:2d:7d:b8:ca:9f:f5:f1:6f",
                "KeyName": "my-key-pair",
                "KeyType": "rsa",
                "Tags": [],
                "CreateTime": "2022-05-27T21:51:16.000Z"
            }
        ]
    }

For more information, see `Describe public keys <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/describe-keys.html>`__ in the *Amazon EC2 User Guide*.
