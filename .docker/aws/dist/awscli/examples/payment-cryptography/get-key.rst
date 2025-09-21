**To get the metadata of a key**

The following ``get-key`` example returns the metadata of the key associated with the alias. This operation does not return cryptographic material. ::

    aws payment-cryptography get-key \
        --key-identifier alias/sampleAlias1

Output::

    {
        "Key": {
            "CreateTimestamp": "1686800690",
            "DeletePendingTimestamp": "1687405998",
            "Enabled": true,
            "Exportable": true,
            "KeyArn": "arn:aws:payment-cryptography:us-west-2:123456789012:key/kwapwa6qaifllw2h",
            "KeyAttributes": {
                "KeyAlgorithm": "TDES_2KEY",
                "KeyClass": "SYMMETRIC_KEY",
                "KeyModesOfUse": {
                    "Decrypt": false,
                    "DeriveKey": false,
                    "Encrypt": false,
                    "Generate": true,
                    "NoRestrictions": false,
                    "Sign": false,
                    "Unwrap": false,
                    "Verify": true,
                    "Wrap": false
                },
                "KeyUsage": "TR31_C0_CARD_VERIFICATION_KEY"
            },
            "KeyCheckValue": "F2E50F",
            "KeyCheckValueAlgorithm": "ANSI_X9_24",
            "KeyOrigin": "AWS_PAYMENT_CRYPTOGRAPHY",
            "KeyState": "DELETE_PENDING",
            "UsageStartTimestamp": "1686801190"
        }
    }

For more information, see `Get keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/getkeys.html>`__ in the *AWS Payment Cryptography User Guide*.