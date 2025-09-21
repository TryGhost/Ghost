**To disable block public access for AMIs in the specified Region**

The following ``disable-image-block-public-access`` example disables block public access for AMIs at the account level in the specified Region. ::

    aws ec2 disable-image-block-public-access \
        --region us-east-1

Output::

    {
        "ImageBlockPublicAccessState": "unblocked"
    }

For more information, see `Block public access to your AMIs <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/block-public-access-to-amis.html>`__ in the *Amazon EC2 User Guide*.
