**To get the block public access state for AMIs in the specified Region**

The following ``get-image-block-public-access-state`` example gets the block public access state for AMIs at the account level in the specified Region. ::

    aws ec2 get-image-block-public-access-state \
        --region us-east-1

Output::

    {
        "ImageBlockPublicAccessState": "block-new-sharing"
    }

For more information, see `Block public access to your AMIs <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-intro.html#block-public-access-to-amis>`__ in the *Amazon EC2 User Guide*.
