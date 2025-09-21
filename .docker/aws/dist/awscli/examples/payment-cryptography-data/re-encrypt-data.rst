**To re-encrypt data with a different key**

The following ``re-encrypt-data`` example decrypts cipher text that was encrypted using an AES symmetric key and re-encrypts it using a Derived Unique Key Per Transaction (DUKPT) key. ::

    aws payment-cryptography-data re-encrypt-data \
        --incoming-key-identifier arn:aws:payment-cryptography:us-west-2:111122223333:key/hyvv7ymboitd4vfy \
        --outgoing-key-identifier arn:aws:payment-cryptography:us-west-2:111122223333:key/jl6ythkcvzesbxen \
        --cipher-text 4D2B0BDBA192D5AEFEAA5B3EC28E4A65383C313FFA25140101560F75FE1B99F27192A90980AB9334 \
        --incoming-encryption-attributes "Dukpt={Mode=ECB,KeySerialNumber=0123456789111111}" \
        --outgoing-encryption-attributes '{"Symmetric": {"Mode": "ECB"}}'

Output::

    {
        "CipherText": "F94959DA30EEFF0C035483C6067667CF6796E3C1AD28C2B61F9CFEB772A8DD41C0D6822931E0D3B1",
        "KeyArn": "arn:aws:payment-cryptography:us-west-2:111122223333:key/jl6ythkcvzesbxen",
        "KeyCheckValue": "2E8CD9"
    }

For more information, see `Encrypt and decrypt data  <https://docs.aws.amazon.com/payment-cryptography/latest/userguide/crypto-ops.encryptdecrypt.html>`__ in the *AWS Payment Cryptography User Guide*.