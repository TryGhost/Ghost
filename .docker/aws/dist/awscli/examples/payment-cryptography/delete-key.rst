**To delete a key**

The following ``delete-key`` example schedules a key for deletion after 7 days, which is the default waiting period. ::

    aws payment-cryptography delete-key \
        --key-identifier arn:aws:payment-cryptography:us-west-2:123456789012:key/kwapwa6qaifllw2h

Output::

    {
        "Key": {
            "CreateTimestamp": "1686801198",
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

For more information, see `Deleting keys <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/keys-deleting.html>`__ in the *AWS Payment Cryptography User Guide*.