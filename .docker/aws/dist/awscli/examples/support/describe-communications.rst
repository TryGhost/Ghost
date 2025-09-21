**To describe the latest communication for a case**

The following ``describe-communications`` example returns the latest communication for the specified support case in your AWS account. ::

    aws support describe-communications \
        --case-id "case-12345678910-2013-c4c1d2bf33c5cf47" \
        --after-time "2020-03-23T21:31:47.774Z" \ 
        --max-item 1

Output::

    {
        "communications": [
            {
                "body": "I want to learn more about an AWS service.",
                "attachmentSet": [],
                "caseId": "case-12345678910-2013-c4c1d2bf33c5cf47",
                "timeCreated": "2020-05-12T23:12:35.000Z",
                "submittedBy": "Amazon Web Services"
            }
        ],
        "NextToken": "eyJuZXh0VG9rZW4iOiBudWxsLCAiYm90b190cnVuY2F0ZV9hbW91bnQEXAMPLE=="
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.
