**To reset your default CMK for EBS encryption**

The following ``reset-ebs-default-kms-key-id`` example resets the default CMK for EBS encryption for your AWS account in the current Region. ::

    aws ec2 reset-ebs-default-kms-key-id
  
Output::

   {
      "KmsKeyId": "arn:aws:kms:us-west-2:123456789012:key/8c5b2c63-b9bc-45a3-a87a-5513eEXAMPLE"
   }
