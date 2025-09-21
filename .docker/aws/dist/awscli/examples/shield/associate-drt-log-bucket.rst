**To authorize the DRT to access an Amazon S3 bucket**

The following ``associate-drt-log-bucket`` example creates an association between the DRT and the specified S3 bucket. This permits the DRT to access the bucket on behalf of the account.::

    aws shield associate-drt-log-bucket \
        --log-bucket flow-logs-for-website-lb

This command produces no output.

For more information, see `Authorize the DDoS Response Team <https://docs.aws.amazon.com/waf/latest/developerguide/authorize-DRT.html>`__ in the *AWS Shield Advanced Developer Guide*.
