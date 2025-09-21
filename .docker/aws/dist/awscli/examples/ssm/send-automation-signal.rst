**To send a signal to an automation execution**

The following ``send-automation-signal`` example sends an Approve signal to an Automation execution. ::

    aws ssm send-automation-signal \
        --automation-execution-id 73c8eef8-f4ee-4a05-820c-e354fEXAMPLE \
        --signal-type "Approve"

This command produces no output.

For more information, see `Running an Automation Workflow with Approvers <https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-working-executing-approval.html>`__ in the *AWS Systems Manager User Guide*.
