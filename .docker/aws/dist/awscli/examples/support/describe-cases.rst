**To describe a case**

The following ``describe-cases`` example returns information about the specified support case in your AWS account. ::

    aws support describe-cases \
        --display-id "1234567890" \
        --after-time "2020-03-23T21:31:47.774Z" \ 
        --include-resolved-cases \
        --language "en" \
        --no-include-communications \
        --max-item 1

Output::

    {
        "cases": [
            {
                "status": "resolved",
                "ccEmailAddresses": [],
                "timeCreated": "2020-03-23T21:31:47.774Z",
                "caseId": "case-12345678910-2013-c4c1d2bf33c5cf47",
                "severityCode": "low",
                "language": "en",
                "categoryCode": "using-aws",
                "serviceCode": "general-info",
                "submittedBy": "myemail@example.com",
                "displayId": "1234567890",
                "subject": "Question about my account"
            }
        ]
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.