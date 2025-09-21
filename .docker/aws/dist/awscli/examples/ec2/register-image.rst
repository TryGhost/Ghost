**Example 1: To register an AMI using a manifest file**

The following ``register-image`` example registers an AMI using the specified manifest file in Amazon S3. ::

    aws ec2 register-image \
        --name my-image \
        --image-location amzn-s3-demo-bucket/myimage/image.manifest.xml

Output::

    {
        "ImageId": "ami-1234567890EXAMPLE"
    }

For more information, see `Amazon Machine Images (AMI) <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.

**Example 2: To register an AMI using a snapshot of a root device**

The following ``register-image`` example registers an AMI using the specified snapshot of an EBS root volume as device ``/dev/xvda``. The block device mapping also includes an empty 100 GiB EBS volume as device ``/dev/xvdf``. ::

    aws ec2 register-image \
        --name my-image \
        --root-device-name /dev/xvda \
        --block-device-mappings DeviceName=/dev/xvda,Ebs={SnapshotId=snap-0db2cf683925d191f} DeviceName=/dev/xvdf,Ebs={VolumeSize=100}

Output::

    {
        "ImageId": "ami-1a2b3c4d5eEXAMPLE"
    }

For more information, see `Amazon Machine Images (AMI) <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html>`__ in the *Amazon EC2 User Guide*.
