**To disable deregistration protection**

The following ``disable-image-deregistration-protection`` example disables deregistration protection for the specified image. ::

    aws ec2 disable-image-deregistration-protection \
        --image-id ami-0b1a928a144a74ec9

Output::

    {
        "Return": "disabled"
    }

For more information, see `Protect an AMI from deregistration <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-deregistration-protection.html>`__ in the *Amazon EC2 User Guide*.
