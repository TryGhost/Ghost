**To disable EBS encryption by default**

The following ``disable-ebs-encryption-by-default`` example disables EBS encryption by default for your AWS account in the current Region. ::

  aws ec2 disable-ebs-encryption-by-default

Output::

    {
        "EbsEncryptionByDefault": false
    }
