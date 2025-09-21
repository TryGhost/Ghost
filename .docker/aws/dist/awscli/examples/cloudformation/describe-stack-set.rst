**To get information about a stack set**

The following `describe-stack-set`` example displays details about the specified stack set. ::

    aws cloudformation describe-stack-set \
        --stack-set-name my-stack-set

Output::

    {
        "StackSet": {
            "StackSetName": "my-stack-set",
            "StackSetId": "my-stack-set:296a3360-xmpl-40af-be78-9341e95bf743",
            "Description": "Create an Amazon SNS topic",
            "Status": "ACTIVE",
            "TemplateBody": "AWSTemplateFormatVersion: '2010-09-09'\nDescription: An AWS SNS topic\nResources:\n  topic:\n    Type: AWS::SNS::Topic",
            "Parameters": [],
            "Capabilities": [],
            "Tags": [],
            "StackSetARN": "arn:aws:cloudformation:us-west-2:123456789012:stackset/enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
            "AdministrationRoleARN": "arn:aws:iam::123456789012:role/AWSCloudFormationStackSetAdministrationRole",
            "ExecutionRoleName": "AWSCloudFormationStackSetExecutionRole"
        }
    }
