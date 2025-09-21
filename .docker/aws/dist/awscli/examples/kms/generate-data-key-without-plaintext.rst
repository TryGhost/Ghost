**To generate a 256-bit symmetric data key without a plaintext key**

The following ``generate-data-key-without-plaintext`` example requests an encrypted copy of a 256-bit symmetric data key for use outside of AWS. You can call AWS KMS to decrypt the data key when you are ready to use it. 

To request a 256-bit data key, use the ``key-spec`` parameter with a value of ``AES_256``. To request a 128-bit data key, use the ``key-spec`` parameter with a value of ``AES_128``. For all other data key lengths, use the ``number-of-bytes`` parameter.

The KMS key you specify must be a symmetric encryption KMS key, that is, a KMS key with a key spec value of SYMMETRIC_DEFAULT. ::

    aws kms generate-data-key-without-plaintext \
        --key-id "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab" \
        --key-spec AES_256

Output::

    {
        "CiphertextBlob": "AQEDAHjRYf5WytIc0C857tFSnBaPn2F8DgfmThbJlGfR8P3WlwAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDEFogL",
        "KeyId": "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6"
    }

The ``CiphertextBlob`` (encrypted data key) is returned in base64-encoded format. 

For more information, see `Data keys <https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#data-keys>`__ in the *AWS Key Management Service Developer Guide*.