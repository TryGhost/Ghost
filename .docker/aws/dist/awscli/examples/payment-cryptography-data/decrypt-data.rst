**To decrypt ciphertext**

The following ``decrypt-data`` example decrypts ciphertext data using a symmetric key. For this operation, the key must have ``KeyModesOfUse`` set to ``Decrypt`` and ``KeyUsage`` set to ``TR31_D0_SYMMETRIC_DATA_ENCRYPTION_KEY``. ::

    aws payment-cryptography-data decrypt-data \
        --key-identifier arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h \
        --cipher-text 33612AB9D6929C3A828EB6030082B2BD \
        --decryption-attributes 'Symmetric={Mode=CBC}'
        
Output::

    {
        "KeyArn": "arn:aws:payment-cryptography:us-east-2:123456789012:key/kwapwa6qaifllw2h",
        "KeyCheckValue": "71D7AE",
        "PlainText": "31323334313233343132333431323334"
    }

For more information, see `Decrypt data <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/decrypt-data.html>`__ in the *AWS Payment Cryptography User Guide*.