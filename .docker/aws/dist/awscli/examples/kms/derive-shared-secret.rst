**To derive a shared secret**

The following ``derive-shared-secret`` example derives a shared secret using a key agreement algorithm.

You must use an asymmetric NIST-recommended elliptic curve (ECC) or SM2 (China Regions only) KMS key pair with a ``KeyUsage`` value of ``KEY_AGREEMENT`` to call DeriveSharedSecret. ::

    aws kms derive-shared-secret \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --key-agreement-algorithm ECDH \
        --public-key "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvH3Yj0wbkLEpUl95Cv1cJVjsVNSjwGq3tCLnzXfhVwVvmzGN8pYj3U8nKwgouaHbBWNJYjP5VutbbkKS4Kv4GojwZBJyHN17kmxo8yTjRmjR15SKIQ8cqRA2uaERMLnpztIXdZp232PQPbWGxDyXYJ0aJ5EFSag"

Output::

    {
        "KeyId": "1234abcd-12ab-34cd-56ef-1234567890ab",
        "SharedSecret": "MEYCIQCKZLWyTk5runarx6XiAkU9gv3lbwPO/pHa+DXFehzdDwIhANwpsIV2g/9SPWLLsF6p/hiSskuIXMTRwqrMdVKWTMHG",
        "KeyAgreementAlgorithm": "ECDH",
        "KeyOrigin": "AWS_KMS"
    }

For more information, see `DeriveSharedSecret <https://docs.aws.amazon.com/kms/latest/APIReference/API_DeriveSharedSecret.html>`__ in the *AWS Key Management Service API Reference*.