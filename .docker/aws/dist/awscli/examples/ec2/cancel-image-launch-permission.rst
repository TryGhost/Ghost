**To cancel having an AMI shared with your Amazon Web Services account**

The following ``cancel-image-launch-permission`` example removes your account from the specified AMI's launch permissions. ::

    aws ec2 cancel-image-launch-permission \
        --image-id ami-0123456789example \
        --region us-east-1

Output::

    {
        "Return": true
    }

For more information, see `Cancel having an AMI shared with your Amazon Web Services account <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cancel-sharing-an-AMI.html#cancel-image-launch-permission>`__ in the *Amazon EC2 User Guide*.
