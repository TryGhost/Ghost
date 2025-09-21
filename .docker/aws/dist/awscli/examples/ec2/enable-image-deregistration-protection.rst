**To enable deregistration protection**

The following ``enable-image-deregistration-protection`` example enables deregistration protection for the specified image. ::

    aws ec2 enable-image-deregistration-protection \
        --image-id ami-0b1a928a144a74ec9

Output::

    {
        "Return": "enabled-without-cooldown"
    }

For more information, see `Protect an EC2 AMI from deregistration <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-deregistration-protection.html>`__ in the *Amazon EC2 User Guide*.
