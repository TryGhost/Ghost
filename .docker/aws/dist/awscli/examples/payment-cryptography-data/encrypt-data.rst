**To encrypt data**

The following ``encrypt-data`` example encrypts plaintext data using a symmetric key. For this operation, the key must have ``KeyModesOfUse`` set to ``Encrypt`` and ``KeyUsage`` set to ``TR31_D0_SYMMETRIC_DATA_ENCRYPTION_KEY``. ::

    aws payment-cryptography-data encrypt-data \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --plain-text 31323334313233343132333431323334 \
        --encryption-attributes 'Symmetric={Mode=CBC}'

Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h",
        "KeyCheckValue": "71D7AE",
        "CipherText": "33612AB9D6929C3A828EB6030082B2BD"
    }

For more information, see `Encrypt data <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/encrypt-data.html>`__ in the *AWS Payment Cryptography User Guide*.