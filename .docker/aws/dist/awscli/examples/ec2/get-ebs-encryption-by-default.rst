**To describe whether EBS encryption by default is enabled**

The following ``get-ebs-encryption-by-default`` example indicates whether EBS encryption by default is enabled for your AWS account in the current Region. ::

    aws ec2 get-ebs-encryption-by-default
  
The following output indicates that EBS encryption by default is disabled. ::

    {
        "EbsEncryptionByDefault": false
    }

The following output indicates that EBS encryption by default is enabled. ::

    {
        "EbsEncryptionByDefault": true
    }
