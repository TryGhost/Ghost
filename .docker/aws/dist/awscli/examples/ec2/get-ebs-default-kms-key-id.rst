**To describe your default CMK for EBS encryption**

The following ``get-ebs-default-kms-key-id`` example describes the default CMK for EBS encryption for your AWS account. ::

    aws ec2 get-ebs-default-kms-key-id

The output shows the default CMK for EBS encryption, which is an AWS managed CMK with the alias ``alias/aws/ebs``. ::

    {
        "KmsKeyId": "alias/aws/ebs"
    }

The following output shows a custom CMK for EBS encryption. ::

    {
        "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/0ea3fef3-80a7-4778-9d8c-1c0c6EXAMPLE"
    }
