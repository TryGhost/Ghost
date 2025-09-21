**To create a grant**

The following ``create-grant`` example creates a grant that allows the ``exampleUser`` user to use the ``decrypt`` command on the ``1234abcd-12ab-34cd-56ef-1234567890ab`` example KMS key. The retiring principal is the ``adminRole`` role. The grant uses the ``EncryptionContextSubset`` grant constraint to allow this permission only when the encryption context in the ``decrypt`` request includes the ``"Department": "IT"`` key-value pair. ::

    aws kms create-grant \
        --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
        --grantee-principal arn:aws:iam::123456789012:user/exampleUser \
        --operations Decrypt \
        --constraints EncryptionContextSubset={Department=IT} \
        --retiring-principal arn:aws:iam::123456789012:role/adminRole

Output::

    {
        "GrantId": "1a2b3c4d2f5e69f440bae30eaec9570bb1fb7358824f9ddfa1aa5a0dab1a59b2",
        "GrantToken": "<grant token here>"
    }

To view detailed information about the grant, use the ``list-grants`` command.

For more information, see `Grants in AWS KMS <https://docs.aws.amazon.com/kms/latest/developerguide/grants.html>`__ in the *AWS Key Management Service Developer Guide*.