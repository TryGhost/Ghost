**To store an AMI in an S3 bucket**

The following ``create-store-image-task`` example stores an AMI in an S3 bucket. Specify the ID of the AMI and the name of the S3 bucket in which to store the AMI. ::

    aws ec2 create-store-image-task \
      --image-id ami-1234567890abcdef0 \
      --bucket my-ami-bucket

Output::

    {
        "ObjectKey": "ami-1234567890abcdef0.bin"
    }

For more information, see `Store and restore an AMI using S3 <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-store-restore.html>`__ in the *Amazon EC2 User Guide*.

