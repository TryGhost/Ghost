**To authorize the DRT to mitigate potential attacks on your behalf**

The following ``associate-drt-role`` example creates an association between the DRT and the specified role. The DRT can use the role to access and manage the account. ::

    aws shield associate-drt-role \
        --role-arn arn:aws:iam::123456789012:role/service-role/DrtRole

This command produces no output.

For more information, see `Authorize the DDoS Response Team <https://docs.aws.amazon.com/waf/latest/developerguide/authorize-DRT.html>`__ in the *AWS Shield Advanced Developer Guide*.
