**To list stack set operation results**

The following command displays the results of an update operation on instances in the specified stack set. ::

    aws cloudformation list-stack-set-operation-results \
        --stack-set-name enable-config \
        --operation-id 35d45ebc-ed88-xmpl-ab59-0197a1fc83a0

Output::

    {
        "Summaries": [
            {
                "Account": "223456789012",
                "Region": "us-west-2",
                "Status": "SUCCEEDED",
                "AccountGateResult": {
                    "Status": "SKIPPED",
                    "StatusReason": "Function not found: arn:aws:lambda:eu-west-1:223456789012:function:AWSCloudFormationStackSetAccountGate"
                }
            },
            {
                "Account": "223456789012",
                "Region": "ap-south-1",
                "Status": "CANCELLED",
                "StatusReason": "Cancelled since failure tolerance has exceeded"
            }
        ]
    }

**Note:** The ``SKIPPED`` status for ``AccountGateResult`` is expected for successful operations unless you create an account gate function.
