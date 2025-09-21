**To generate an ECC NIST P384 asymmetric data key pair**

The following ``generate-data-key-pair-without-plaintext`` example requests an ECC NIST P384 key pair for use outside of AWS. 

The command returns a plaintext public key and a copy of the private key encrypted under the specified KMS key. It does not return a plaintext private key. You can safely store the encrypted private key with the encrypted data, and call AWS KMS to decrypt the private key when you need to use it.

To request an ECC NIST P384 asymmetric data key pair, use the ``key-pair-spec`` parameter with a value of ``ECC_NIST_P384``.

The KMS key you specify must be a symmetric encryption KMS key, that is, a KMS key with a ``KeySpec`` value of ``SYMMETRIC_DEFAULT``. 

NOTE: The values in the output of this example are truncated for display. ::

    aws kms generate-data-key-pair-without-plaintext \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --key-pair-spec ECC_NIST_P384

Output::
    
    {
        "PrivateKeyCiphertextBlob": "AQIDAHi6LtupRpdKl2aJTzkK6FbhOtQkMlQJJH3PdtHvS/y+hAFFxmiD134doUDzMGmfCEtcAAAHaTCCB2UGCSqGSIb3DQEHBqCCB1...",
        "PublicKey": "MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA3A3eGMyPrvSn7+LdlJE1oUoQV5HpEuHAVbdOyND+NmYDH/mL1OSIEuLrcdZ5hrMH4pk83r40l...",
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6",
        "KeyPairSpec": "ECC_NIST_P384"
    }

The ``PublicKey`` and ``PrivateKeyCiphertextBlob`` are returned in base64-encoded format. 

For more information, see `Data key pairs <https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#data-key-pairs>`__ in the *AWS Key Management Service Developer Guide*.