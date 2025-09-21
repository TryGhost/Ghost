**To restore an AMI from an S3 bucket**

The following ``create-restore-image-task`` example restores an AMI from an S3 bucket. Use the values for ``S3ObjectKey `` and ``Bucket`` from the ``describe-store-image-tasks`` output, specify the object key of the AMI and the name of the S3 bucket to which the AMI was copied, and specify the name for the restored AMI. The name must be unique for AMIs in the Region for this account. The restored AMI will receive a new AMI ID. ::

    aws ec2 create-restore-image-task \
        --object-key ami-1234567890abcdef0.bin \
        --bucket my-ami-bucket \
        --name 'New AMI Name'

Output::

    {
        "ImageId": "ami-0eab20fe36f83e1a8"
    }

For more information, see `Store and restore an AMI using S3 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-store-restore.html>`__ in the *Amazon EC2 User Guide*.
