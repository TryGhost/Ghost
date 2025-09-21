**To restore a key that is scheduled for deletion**

The following ``restore-key`` example cancels the deletion of a key. ::

    aws payment-cryptography restore-key \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h

Output::

    {
        "Key": {
            "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h",
            "KeyAttributes": {
                "KeyUsage": "TR31_V2_VISA_PIN_VERIFICATION_KEY",
                "KeyClass": "SYMMETRIC_KEY",
                "KeyAlgorithm": "TDES_3KEY",
                "KeyModesOfUse": {
                    "Encrypt": false,
                    "Decrypt": false,
                    "Wrap": false,
                    "Unwrap": false,
                    "Generate": true,
                    "Sign": false,
                    "Verify": true,
                    "DeriveKey": false,
                    "NoRestrictions": false
                }
            },
            "KeyCheckValue": "",
            "KeyCheckValueAlgorithm": "ANSI_X9_24",
            "Enabled": false,
            "Exportable": true,
            "KeyState": "CREATE_COMPLETE",
            "KeyOrigin": "AWS_PAYMENT_CRYPTOGRAPHY",
            "CreateTimestamp": "1686800690",
            "UsageStopTimestamp": "1687405998"
        }
    }

For more information, see `Deleting keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/keys-deleting.html>`__ in the *AWS Payment Cryptography User Guide*.