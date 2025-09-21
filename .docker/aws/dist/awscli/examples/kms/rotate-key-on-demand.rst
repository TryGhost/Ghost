**To perform on-demand rotation of a KMS key**

The following ``rotate-key-on-demand`` example immediately initiates rotation of the key material for the specified KMS key. ::

    aws kms rotate-key-on-demand \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab

Output::

    {
        "KeyId": "1234abcd-12ab-34cd-56ef-1234567890ab"
    }

For more information, see `How to perform on-demand key rotation <https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html#rotating-keys-on-demand>`__ in the *AWS Key Management Service Developer Guide*.
