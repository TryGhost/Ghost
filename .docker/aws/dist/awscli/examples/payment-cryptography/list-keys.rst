**To get a list of keys**

The following ``list-keys`` example shows all of the keys in your account in this Region. ::

    aws payment-cryptography list-keys

Output::

    {
        "Keys": [
        {
            "CreateTimestamp": "1666506840",
            "Enabled": false,
            "Exportable": true,
            "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h",
            "KeyAttributes": {
                "KeyAlgorithm": "TDES_3KEY",
                "KeyClass": "SYMMETRIC_KEY",
                "KeyModesOfUse": {
                    "Decrypt": true,
                    "DeriveKey": false,
                    "Encrypt": true,
                    "Generate": false,
                    "NoRestrictions": false,
                    "Sign": false,
                    "Unwrap": true,
                    "Verify": false,
                    "Wrap": true
                },
                "KeyUsage": "TR31_P1_PIN_GENERATION_KEY"
            },
            "KeyCheckValue": "369D",
            "KeyCheckValueAlgorithm": "ANSI_X9_24",
            "KeyOrigin": "AWS_PAYMENT_CRYPTOGRAPHY",
            "KeyState": "CREATE_COMPLETE",
            "UsageStopTimestamp": "1666938840"
        }
        ]
    }

For more information, see `List keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/alias-about.html>`__ in the *AWS Payment Cryptography User Guide*.