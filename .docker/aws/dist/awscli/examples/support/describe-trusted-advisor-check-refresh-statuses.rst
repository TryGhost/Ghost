**To list the refresh statuses of AWS Trusted Advisor checks**

The following ``describe-trusted-advisor-check-refresh-statuses`` example lists the refresh statuses for two Trusted Advisor checks: Amazon S3 Bucket Permissions and IAM Use. ::

    aws support describe-trusted-advisor-check-refresh-statuses \
        --check-id "Pfx0RwqBli" "zXCkfM1nI3"

Output::

    {
        "statuses": [
            {
                "checkId": "Pfx0RwqBli",
                "status": "none",
                "millisUntilNextRefreshable": 0
            },
            {
                "checkId": "zXCkfM1nI3",
                "status": "none",
                "millisUntilNextRefreshable": 0
            }
        ]
    }

For more information, see `AWS Trusted Advisor <https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html>`__ in the *AWS Support User Guide*.
