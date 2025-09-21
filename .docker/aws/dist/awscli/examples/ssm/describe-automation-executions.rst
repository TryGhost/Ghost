**To describe an automation execution**

The following ``describe-automation-executions`` example displays details about an Automation execution. ::

    aws ssm describe-automation-executions \
        --filters Key=ExecutionId,Values=73c8eef8-f4ee-4a05-820c-e354fEXAMPLE
  
Output::

    {
        "AutomationExecutionMetadataList": [
            {
                "AutomationExecutionId": "73c8eef8-f4ee-4a05-820c-e354fEXAMPLE",
                "DocumentName": "AWS-StartEC2Instance",
                "DocumentVersion": "1",
                "AutomationExecutionStatus": "Success",
                "ExecutionStartTime": 1583737233.748,
                "ExecutionEndTime": 1583737234.719,
                "ExecutedBy": "arn:aws:sts::29884EXAMPLE:assumed-role/mw_service_role/OrchestrationService",
                "LogFile": "",
                "Outputs": {},
                "Mode": "Auto",
                "Targets": [],
                "ResolvedTargets": {
                    "ParameterValues": [],
                    "Truncated": false
                },
                "AutomationType": "Local"
            }
        ]
    }

For more information, see `Running a Simple Automation Workflow <https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-working-executing.html>`__ in the *AWS Systems Manager User Guide*.
