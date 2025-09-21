**To cancel the deprecation of an AMI**

The following ``disable-image-deprecation`` example cancels the deprecation of an AMI, which removes the ``DeprecationTime`` field from the ``describe-images`` output. You must be the AMI owner to perform this procedure. ::

    aws ec2 disable-image-deprecation \
        --image-id ami-1234567890abcdef0

Output::

    {
        "RequestID": "11aabb229-4eac-35bd-99ed-be587EXAMPLE",
        "Return": "true"
    }

For more information, see `Deprecate an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-deprecate.html>`__ in the *Amazon EC2 User Guide*.
