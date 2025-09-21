**To get information about all key pairs**

The following ``get-key-pairs`` example displays details about all of the key pairs in the configured AWS Region. ::

    aws lightsail get-key-pairs

Output::

    {
        "keyPairs": [
            {
                "name": "MyKey1",
                "arn": "arn:aws:lightsail:us-west-2:111122223333:KeyPair/19a4efdf-3054-43d6-91fd-eEXAMPLE21bf",
                "supportCode": "6EXAMPLE3362/MyKey1",
                "createdAt": 1571255026.975,
                "location": {
                    "availabilityZone": "all",
                    "regionName": "us-west-2"
                },
                "resourceType": "KeyPair",
                "tags": [],
                "fingerprint": "00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:gg:hh:ii:jj"
            }
        ]
    }
