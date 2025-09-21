**To refresh an AWS Trusted Advisor check**

The following ``refresh-trusted-advisor-check`` example refreshes the Amazon S3 Bucket Permissions Trusted Advisor check in your AWS account. ::

    aws support refresh-trusted-advisor-check \
        --check-id "Pfx0RwqBli"

Output::

    {
        "status": {
            "checkId": "Pfx0RwqBli",
            "status": "enqueued",
            "millisUntilNextRefreshable": 3599992
        }
    }

For more information, see `AWS Trusted Advisor <https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html>`__ in the *AWS Support User Guide*.
