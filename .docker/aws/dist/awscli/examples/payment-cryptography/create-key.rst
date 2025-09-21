**To create a key**

The following ``create-key`` example generates a 2KEY TDES key you can use to generate and verify CVV/CVV2 values. ::

    aws payment-cryptography create-key \
        --exportable \
        --key-attributes KeyAlgorithm=TDES_2KEY, KeyUsage=TR31_C0_CARD_VERIFICATION_KEY,KeyClass=SYMMETRIC_KEY, KeyModesOfUse={Generate=true,Verify=true}

Output::

    {
        "Key": {
            "CreateTimestamp": "1686800690",
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
            "KeyState": "CREATE_COMPLETE",
            "UsageStartTimestamp": "1686800690"
        }
    }

For more information, see `Generating keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/create-keys.html>`__ in the *AWS Payment Cryptography User Guide*.