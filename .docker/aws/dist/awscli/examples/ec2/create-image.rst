**Example 1: To create an AMI from an Amazon EBS-backed instance**

The following ``create-image`` example creates an AMI from the specified instance. ::

    aws ec2 create-image \
        --instance-id i-1234567890abcdef0 \
        --name "My server" \
        --description "An AMI for my server"

Output::

    {
        "ImageId": "ami-abcdef01234567890"
    }

For more information about specifying a block device mapping for your AMI, see `Specifying a block device mapping for an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/block-device-mapping-concepts.html#create-ami-bdm>`__ in the *Amazon EC2 User Guide*.

**Example 2: To create an AMI from an Amazon EBS-backed instance without reboot**

The following ``create-image`` example creates an AMI and sets the --no-reboot parameter, so that the instance is not rebooted before the image is created. ::

    aws ec2 create-image \
        --instance-id i-1234567890abcdef0 \
        --name "My server" \
        --no-reboot

Output::

    {
        "ImageId": "ami-abcdef01234567890"
    }

For more information about specifying a block device mapping for your AMI, see `Specifying a block device mapping for an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/block-device-mapping-concepts.html#create-ami-bdm>`__ in the *Amazon EC2 User Guide*.


**Example 3: To tag an AMI and snapshots on creation**

The following ``create-image`` example creates an AMI, and tags the AMI and the snapshots with the same tag ``cost-center=cc123`` ::

    aws ec2 create-image \
        --instance-id i-1234567890abcdef0 \
        --name "My server" \
        --tag-specifications "ResourceType=image,Tags=[{Key=cost-center,Value=cc123}]" "ResourceType=snapshot,Tags=[{Key=cost-center,Value=cc123}]"


Output::

    {
        "ImageId": "ami-abcdef01234567890"
    }

For more information about tagging your resources on creation, see `Add tags on resource creation <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html#tag-on-create-examples>`__ in the *Amazon EC2 User Guide*.