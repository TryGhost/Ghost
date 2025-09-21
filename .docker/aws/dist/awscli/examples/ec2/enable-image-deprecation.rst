**To deprecate an AMI**

The following ``enable-image-deprecation`` example deprecates an AMI on a specific date and time. If you specify a value for seconds, Amazon EC2 rounds the seconds to the nearest minute. You must be the AMI owner to perform this procedure. ::

    aws ec2 enable-image-deprecation \
        --image-id ami-1234567890abcdef0 \
        --deprecate-at '2022-10-15T13:17:12.000Z'

Output::

    {
        "RequestID": "59dbff89-35bd-4eac-99ed-be587EXAMPLE",
        "Return": "true"
    }

For more information, see `Deprecate an AMI <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ami-deprecate.html#deprecate-ami>`__ in the *Amazon EC2 User Guide*.
