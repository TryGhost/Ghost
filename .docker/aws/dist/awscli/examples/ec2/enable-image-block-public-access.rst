**To enable block public access for AMIs in the specified Region**

The following ``enable-image-block-public-access`` example enables block public access for AMIs at the account level in the specified Region. ::

    aws ec2 enable-image-block-public-access \
        --region us-east-1 \
        --image-block-public-access-state block-new-sharing

Output::

    {
        "ImageBlockPublicAccessState": "block-new-sharing"
    }

For more information, see `Block public access to your AMIs <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharingamis-intro.html#block-public-access-to-amis>`__ in the *Amazon EC2 User Guide*.
