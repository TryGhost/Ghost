**To get information about a stack set operation**

The following `describe-stack-set-operation`` example displays details for an update operation on the specified stack set. ::

    aws cloudformation describe-stack-set-operation \
        --stack-set-name enable-config \
        --operation-id 35d45ebc-ed88-xmpl-ab59-0197a1fc83a0

Output::

    {
        "StackSetOperation": {
            "OperationId": "35d45ebc-ed88-xmpl-ab59-0197a1fc83a0",
            "StackSetId": "enable-config:296a3360-xmpl-40af-be78-9341e95bf743",
            "Action": "UPDATE",
            "Status": "SUCCEEDED",
            "OperationPreferences": {
                "RegionOrder": [
                    "us-east-1",
                    "us-west-2",
                    "eu-west-1",
                    "us-west-1"
                ],
                "FailureToleranceCount": 7,
                "MaxConcurrentCount": 2
            },
            "AdministrationRoleARN": "arn:aws:iam::123456789012:role/AWSCloudFormationStackSetAdministrationRole",
            "ExecutionRoleName": "AWSCloudFormationStackSetExecutionRole",
            "CreationTimestamp": "2019-10-03T16:28:44.377Z",
            "EndTimestamp": "2019-10-03T16:42:08.607Z"
        }
    }
