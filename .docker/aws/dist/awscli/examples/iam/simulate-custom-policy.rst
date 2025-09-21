**Example 1: To simulate the effects of all IAM policies associated with an IAM user or role**

The following ``simulate-custom-policy`` shows how to provide both the policy and define variable values and simulate an API call to see if it is allowed or denied. The following example shows a policy that enables database access only after a specified date and time. The simulation succeeds because the simulated actions and the specified ``aws:CurrentTime`` variable all match the requirements of the policy. ::

    aws iam simulate-custom-policy \
        --policy-input-list '{"Version":"2012-10-17","Statement":{"Effect":"Allow","Action":"dynamodb:*","Resource":"*","Condition":{"DateGreaterThan":{"aws:CurrentTime":"2018-08-16T12:00:00Z"}}}}' \
        --action-names dynamodb:CreateBackup \
        --context-entries "ContextKeyName='aws:CurrentTime',ContextKeyValues='2019-04-25T11:00:00Z',ContextKeyType=date"

Output::

    {
        "EvaluationResults": [
            {
                "EvalActionName": "dynamodb:CreateBackup",
                "EvalResourceName": "*",
                "EvalDecision": "allowed",
                "MatchedStatements": [
                    {
                        "SourcePolicyId": "PolicyInputList.1",
                        "StartPosition": {
                            "Line": 1,
                            "Column": 38
                        },
                        "EndPosition": {
                            "Line": 1,
                            "Column": 167
                        }
                    }
                ],
                "MissingContextValues": []
            }
        ]
    }


**Example 2: To simulate a command that is prohibited by the policy**

The following ``simulate-custom-policy`` example shows the results of simulating a command that is prohibited by the policy. In this example, the provided date is before that required by the policy's condition. ::

    aws iam simulate-custom-policy \
        --policy-input-list '{"Version":"2012-10-17","Statement":{"Effect":"Allow","Action":"dynamodb:*","Resource":"*","Condition":{"DateGreaterThan":{"aws:CurrentTime":"2018-08-16T12:00:00Z"}}}}' \
        --action-names dynamodb:CreateBackup \
        --context-entries "ContextKeyName='aws:CurrentTime',ContextKeyValues='2014-04-25T11:00:00Z',ContextKeyType=date"

Output::

    {
        "EvaluationResults": [
            {
                "EvalActionName": "dynamodb:CreateBackup",
                "EvalResourceName": "*",
                "EvalDecision": "implicitDeny",
                "MatchedStatements": [],
                "MissingContextValues": []
            }
        ]
    }

For more information, see `Testing IAM policies with the IAM policy simulator <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html>`__ in the *AWS IAM User Guide*.