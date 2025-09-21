**To create a CloudFront public key**

The following example creates a CloudFront public key by providing the
parameters in a JSON file named ``pub-key-config.json``. Before you can use
this command, you must have a PEM-encoded public key. For more information, see
`Create an RSA Key Pair
<https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/field-level-encryption.html#field-level-encryption-setting-up-step1>`_
in the *Amazon CloudFront Developer Guide*.

::

    aws cloudfront create-public-key \
        --public-key-config file://pub-key-config.json

The file ``pub-key-config.json`` is a JSON document in the current folder that
contains the following. Note that the public key is encoded in PEM format.

::

    {
        "CallerReference": "cli-example",
        "Name": "ExampleKey",
        "EncodedKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxPMbCA2Ks0lnd7IR+3pw\nwd3H/7jPGwj8bLUmore7bX+oeGpZ6QmLAe/1UOWcmZX2u70dYcSIzB1ofZtcn4cJ\nenHBAzO3ohBY/L1tQGJfS2A+omnN6H16VZE1JCK8XSJyfze7MDLcUyHZETdxuvRb\nA9X343/vMAuQPnhinFJ8Wdy8YBXSPpy7r95ylUQd9LfYTBzVZYG2tSesplcOkjM3\n2Uu+oMWxQAw1NINnSLPinMVsutJy6ZqlV3McWNWe4T+STGtWhrPNqJEn45sIcCx4\nq+kGZ2NQ0FyIyT2eiLKOX5Rgb/a36E/aMk4VoDsaenBQgG7WLTnstb9sr7MIhS6A\nrwIDAQAB\n-----END PUBLIC KEY-----\n",
        "Comment": "example public key"
    }

Output::

    {
        "Location": "https://cloudfront.amazonaws.com/2019-03-26/public-key/KDFB19YGCR002",
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
