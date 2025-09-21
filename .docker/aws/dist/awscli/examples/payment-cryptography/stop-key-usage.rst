**To disable a key**

The following ``stop-key-usage`` example disables a key. ::

    aws payment-cryptography stop-key-usage \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h

Output::

    {
        "Key": {
            "CreateTimestamp": "1686800690",
            "Enabled": true,
            "Exportable": true,
            "KeyArn": "arn:aws:payment-cryptography:us-east-2:111122223333:key/alsuwfxug3pgy6xh",
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
            "UsageStartTimestamp": "1686800690"
        }
    }

For more information, see `Enabling and disabling keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/keys-enable-disable.html>`__ in the *AWS Payment Cryptography User Guide*.