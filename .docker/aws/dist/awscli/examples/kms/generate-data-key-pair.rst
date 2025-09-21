**To generate an 2048-bit RSA asymmetric data key pair**

The following ``generate-data-key-pair`` example requests a 2048-bit RSA asymmetric data key pair for use outside of AWS. The command returns a plaintext public key and a plaintext private key for immediate use and deletion, and a copy of the private key encrypted under the specified KMS key. You can safely store the encrypted private key with the encrypted data.

To request a 2048-bit RSA asymmetric data key pair, use the ``key-pair-spec`` parameter with a value of ``RSA_2048``.

The KMS key you specify must be a symmetric encryption KMS key, that is, a KMS key with a ``KeySpec`` value of ``SYMMETRIC_DEFAULT``.

NOTE: The values in the output of this example are truncated for display. ::

    aws kms generate-data-key-pair \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --key-pair-spec RSA_2048

Output::

    {
        "PrivateKeyCiphertextBlob": "AQIDAHi6LtupRpdKl2aJTzkK6FbhOtQkMlQJJH3PdtHvS/y+hAFFxmiD134doUDzMGmfCEtcAAAHaTCCB2UGCSqGSIb3DQEHBqCCB1...",
        "PrivateKeyPlaintext": "MIIG/QIBADANBgkqhkiG9w0BAQEFAASCBucwggbjAgEAAoIBgQDcDd4YzI+u9Kfv4t2UkTWhShBXkekS4cBVt07I0P42ZgMf+YvU5IgS4ut...",
        "PublicKey": "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA3A3eGMyPrvSn7+LdlJE1oUoQV5HpEuHAVbdOyND+NmYDH/mL1OSIEuLrcdZ5hrMH4pk83r40l...",
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6"
        "KeyPairSpec": "RSA_2048"
    }

The ``PublicKey``, ``PrivateKeyPlaintext``, and ``PrivateKeyCiphertextBlob`` are returned in base64-encoded format. 

For more information, see `Data key pairs <https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#data-key-pairs>`__ in the *AWS Key Management Service Developer Guide*.