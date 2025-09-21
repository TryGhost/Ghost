**To create sample GuardDuty findings in the current region.**

This example shows how to create a sample finding of the provided types. ::

    aws guardduty create-sample-findings \
        --detector-id b6b992d6d2f48e64bc59180bfexample \
        --finding-types UnauthorizedAccess:EC2/TorClient UnauthorizedAccess:EC2/TorRelay

This command produces no output.

For more information, see `Sample findings <https://docs.aws.amazon.com/guardduty/latest/ug/sample_findings.html>`__ in the *GuardDuty User Guide*.