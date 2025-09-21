**Example 1: To execute an automation document**

The following ``start-automation-execution`` example runs an Automation document. ::

    aws ssm start-automation-execution \
        --document-name "AWS-UpdateLinuxAmi" \
        --parameters "AutomationAssumeRole=arn:aws:iam::123456789012:role/SSMAutomationRole,SourceAmiId=ami-EXAMPLE,IamInstanceProfileName=EC2InstanceRole"

Output::

    {
      "AutomationExecutionId": "4105a4fc-f944-11e6-9d32-0a1b2EXAMPLE"
    }

For more information, see `Running an Automation Workflow Manually <https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-working-executing-manually.html>`__ in the *AWS Systems Manager User Guide*.

**Example 2: To run a shared automation document**

The following ``start-automation-execution`` example runs a shared Automation document. ::

    aws ssm start-automation-execution \
        --document-name "arn:aws:ssm:us-east-1:123456789012:document/ExampleDocument"

Output::

    {
      "AutomationExecutionId": "4105a4fc-f944-11e6-9d32-0a1b2EXAMPLE"
    }

For more information, see `Using shared SSM documents <https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-using-shared.html>`__ in the *AWS Systems Manager User Guide*.