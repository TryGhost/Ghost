**To get the items required to import key material into a KMS key**

The following ``get-parameters-for-import`` example gets the public key and import token that you need to import key material into a KMS key. When you use the ``import-key-material`` command, be sure to use the import token and key material encrypted by the public key that were returned in the same ``get-parameters-for-import`` command. Also, the wrapping algorithm that you specify in this command must be one that you use to encrypt the key material with the public key.

To specify the KMS key, use the ``key-id`` parameter. This example uses an key ID, but you can use a key ID or key ARN in this command. ::

    aws kms get-parameters-for-import \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --wrapping-algorithm RSAES_OAEP_SHA_256 \
        --wrapping-key-spec RSA_2048

Output::

    {
        "KeyId": "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab",
        "PublicKey": "<public key base64 encoded data>",
        "ImportToken": "<import token base64 encoded data>",
        "ParametersValidTo": 1593893322.32
    }

For more information, see `Download the public key and import token <https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys-get-public-key-and-token.html>`__ in the *AWS Key Management Service Developer Guide*.