**To remove the authorization for DRT to access an Amazon S3 bucket on your behalf**

The following ``disassociate-drt-log-bucket`` example removes the association between the DRT and the specified S3 bucket. After this command completes, the DRT can no longer access the bucket on behalf of the account. ::

    aws shield disassociate-drt-log-bucket \
        --log-bucket flow-logs-for-website-lb

This command produces no output.

For more information, see `Authorize the DDoS Response Team <https://docs.aws.amazon.com/waf/latest/developerguide/authorize-DRT.html>`__ in the *AWS Shield Advanced Developer Guide*.
