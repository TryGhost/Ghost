**To configure server-side encryption for a bucket**

The following ``put-bucket-encryption`` example sets AES256 encryption as the default for the specified bucket. ::

    aws s3api put-bucket-encryption \
        --bucket amzn-s3-demo-bucket \
        --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

This command produces no output.