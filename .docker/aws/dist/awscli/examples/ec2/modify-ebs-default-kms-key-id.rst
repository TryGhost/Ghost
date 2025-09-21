**To set your default CMK for EBS encryption**

The following ``modify-ebs-default-kms-key-id`` example sets the specified CMK as the default CMK for EBS encryption for your AWS account in the current Region. ::

    aws ec2 modify-ebs-default-kms-key-id \
        --kms-key-id alias/my-cmk
  
Output::

    {
        "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/0ea3fef3-80a7-4778-9d8c-1c0c6EXAMPLE"
    }
