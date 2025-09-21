**Example 1: To generate a 256-bit symmetric data key**

The following ``generate-data-key`` example requests a 256-bit symmetric data key for use outside of AWS. The command returns a plaintext data key for immediate use and deletion, and a copy of that data key encrypted under the specified KMS key. You can safely store the encrypted data key with the encrypted data.

To request a 256-bit data key, use the ``key-spec`` parameter with a value of ``AES_256``. To request a 128-bit data key, use the ``key-spec`` parameter with a value of ``AES_128``. For all other data key lengths, use the ``number-of-bytes`` parameter.

The KMS key you specify must be a symmetric encryption KMS key, that is, a KMS key with a key spec value of SYMMETRIC_DEFAULT. ::

    aws kms generate-data-key \
        --key-id alias/ExampleAlias \
        --key-spec AES_256

Output::

    {
        "Plaintext": "VdzKNHGzUAzJeRBVY+uUmofUGGiDzyB3+i9fVkh3piw=",
        "KeyId": "arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6",
        "CiphertextBlob": "AQEDAHjRYf5WytIc0C857tFSnBaPn2F8DgfmThbJlGfR8P3WlwAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDEFogLqPWZconQhwHAIBEIA7d9AC7GeJJM34njQvg4Wf1d5sw0NIo1MrBqZa+YdhV8MrkBQPeac0ReRVNDt9qleAt+SHgIRF8P0H+7U="
    }

The ``Plaintext`` (plaintext data key) and the ``CiphertextBlob`` (encrypted data key) are returned in base64-encoded format. 

For more information, see `Data keys <https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html>`__ in the *AWS Key Management Service Developer Guide*.
**Example 2: To generate a 512-bit symmetric data key**

The following ``generate-data-key`` example requests a 512-bit symmetric data key for encryption and decryption. The command returns a plaintext data key for immediate use and deletion, and a copy of that data key encrypted under the specified KMS key. You can safely store the encrypted data key with the encrypted data. 

To request a key length other than 128 or 256 bits, use the ``number-of-bytes`` parameter. To request a 512-bit data key, the following example uses the ``number-of-bytes`` parameter with a value of 64 (bytes).

The KMS key you specify must be a symmetric encryption KMS key, that is, a KMS key with a key spec value of SYMMETRIC_DEFAULT. 

NOTE: The values in the output of this example are truncated for display. ::

    aws kms generate-data-key \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --number-of-bytes 64

Output::
    
    {
        "CiphertextBlob": "AQIBAHi6LtupRpdKl2aJTzkK6FbhOtQkMlQJJH3PdtHvS/y+hAEnX/QQNmMwDfg2korNMEc8AAACaDCCAmQGCSqGSIb3DQEHBqCCAlUwggJRAgEAMIICSgYJKoZ...",
        "Plaintext": "ty8Lr0Bk6OF07M2BWt6qbFdNB+G00ZLtf5MSEb4al3R2UKWGOp06njAwy2n72VRm2m7z/Pm9Wpbvttz6a4lSo9hgPvKhZ5y6RTm4OovEXiVfBveyX3DQxDzRSwbKDPk/...",
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6"
    }

The ``Plaintext`` (plaintext data key) and ``CiphertextBlob`` (encrypted data key) are returned in base64-encoded format. 

For more information, see `Data keys <https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html>`__ in the *AWS Key Management Service Developer Guide*.