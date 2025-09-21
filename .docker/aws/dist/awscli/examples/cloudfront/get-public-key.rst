**To get a CloudFront public key**

The following example gets the CloudFront public key with the ID
``KDFB19YGCR002``, including its ``ETag``. The public key ID is returned in the
`create-public-key <create-public-key.html>`_ and `list-public-keys
<list-public-keys.html>`_ commands.

::

    aws cloudfront get-public-key --id KDFB19YGCR002

Output::

    {
        "ETag": "E2QWRUHEXAMPLE",
        "PublicKey": {
            "Id": "KDFB19YGCR002",
            "CreatedTime": "2019-12-05T18:51:43.781Z",
            "PublicKeyConfig": {
                "CallerReference": "cli-example",
                "Name": "ExampleKey",
                "EncodedKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxPMbCA2Ks0lnd7IR+3pw\nwd3H/7jPGwj8bLUmore7bX+oeGpZ6QmLAe/1UOWcmZX2u70dYcSIzB1ofZtcn4cJ\nenHBAzO3ohBY/L1tQGJfS2A+omnN6H16VZE1JCK8XSJyfze7MDLcUyHZETdxuvRb\nA9X343/vMAuQPnhinFJ8Wdy8YBXSPpy7r95ylUQd9LfYTBzVZYG2tSesplcOkjM3\n2Uu+oMWxQAw1NINnSLPinMVsutJy6ZqlV3McWNWe4T+STGtWhrPNqJEn45sIcCx4\nq+kGZ2NQ0FyIyT2eiLKOX5Rgb/a36E/aMk4VoDsaenBQgG7WLTnstb9sr7MIhS6A\nrwIDAQAB\n-----END PUBLIC KEY-----\n",
                "Comment": "example public key"
            }
        }
    }
