**To retrieve a description of the authorizations the DRT has to mitigate attacks on your behalf**

The following ``describe-drt-access`` example retrieves the role and S3 bucket authorizations that the DRT has, which allow it to respond to potential attacks on your behalf. ::

    aws shield describe-drt-access

Output::

    {
        "RoleArn": "arn:aws:iam::123456789012:role/service-role/DrtRole",
        "LogBucketList": [
            "flow-logs-for-website-lb"
        ]
    }

For more information, see `Authorize the DDoS Response Team <https://docs.aws.amazon.com/waf/latest/developerguide/authorize-DRT.html>`__ in the *AWS Shield Advanced Developer Guide*.
