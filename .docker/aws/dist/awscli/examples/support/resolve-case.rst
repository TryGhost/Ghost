**To resolve a support case**

The following ``resolve-case`` example resolves a support case in your AWS account. ::

    aws support resolve-case \
        --case-id "case-12345678910-2013-c4c1d2bf33c5cf47"

Output::

    {
        "finalCaseStatus": "resolved",
        "initialCaseStatus": "work-in-progress"
    }

For more information, see `Case management <https://docs.aws.amazon.com/awssupport/latest/user/case-management.html>`__ in the *AWS Support User Guide*.