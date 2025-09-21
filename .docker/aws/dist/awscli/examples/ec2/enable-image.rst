**To enable an AMI**

The following ``enable-image`` example enables the specified AMI. ::

    aws ec2 enable-image \
        --image-id ami-1234567890abcdef0

Output::

    {
        "Return": "true"
    }

For more information, see `Disable an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/disable-an-ami.html>`__ in the *Amazon EC2 User Guide*.
