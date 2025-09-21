**To import key material into a KMS key**

The following ``import-key-material`` example uploads key material into a KMS key that was created with no key material. The key state of the KMS key must be ``PendingImport``.

This command uses key material that you encrypted with the public key that the ``get-parameters-for-import`` command returned. It also uses the import token from the same ``get-parameters-for-import`` command. 

The ``expiration-model`` parameter indicates that the key material automatically expires on the date and time specified by the ``valid-to`` parameter. When the key material expires, AWS KMS deletes the key material, the key state of the KMS key changes to ``Pending import`` and the KMS key becomes unusable. To restore the KMS key, you must reimport the same key material. To use different key material, you must create a new KMS key.

Before running this command, replace the example key ID with a valid key ID or key ARN from your AWS account. ::

    aws kms import-key-material \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --encrypted-key-material fileb://EncryptedKeyMaterial.bin \
        --import-token fileb://ImportToken.bin \
        --expiration-model KEY_MATERIAL_EXPIRES \
        --valid-to 2021-09-21T19:00:00Z

Output::

    {
        "KeyId": "1234abcd-12ab-34cd-56ef-1234567890ab",
        "KeyMaterialId": "0b7fd7ddbac6eef27907413567cad8c810e2883dc8a7534067a82ee1142fc1e6"
    }

For more information about importing key material, see `Importing Key Material <https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys.html>`__ in the *AWS Key Management Service Developer Guide*.