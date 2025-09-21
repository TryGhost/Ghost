**To update the encryption configuration**

The following ``put-encryption-config``example updates the encryption configuration for AWS X-Ray data to use the default AWS managed KMS key ``aws/xray``. ::

    aws xray put-encryption-config \
        --type KMS \
        --key-id alias/aws/xray

Output::

    {
        "EncryptionConfig": {
            "KeyId": "arn:aws:kms:us-west-2:123456789012:key/c234g4e8-39e9-4gb0-84e2-b0ea215cbba5",
            "Status": "UPDATING",
            "Type": "KMS"
        }
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html>`__ in the *AWS X-Ray Developer Guide*.
