**To get experiment details**

The following ``get-experiment`` example gets the details of the specified experiment. ::

    aws fis get-experiment \
        --id ABC12DeFGhI3jKLMNOP

Output::

    {
        "experiment": {
            "id": "ABC12DeFGhI3jKLMNOP",
            "experimentTemplateId": "ABCDE1fgHIJkLmNop",
            "roleArn": "arn:aws:iam::123456789012:role/myRole",
            "state": {
                "status": "completed",
                "reason": "Experiment completed."
            },
            "targets": {
                "Instances-Target-1": {
                    "resourceType": "aws:ec2:instance",
                    "resourceArns": [
                        "arn:aws:ec2:us-west-2:123456789012:instance/i-12a3b4c56d78e9012"
                    ],
                    "selectionMode": "ALL"
                }
            },
            "actions": {
                "reboot": {
                    "actionId": "aws:ec2:reboot-instances",
                    "parameters": {},
                    "targets": {
                        "Instances": "Instances-Target-1"
                    },
                    "state": {
                        "status": "completed",
                        "reason": "Action was completed."
                    }
                }
            },
            "stopConditions": [
                {
                    "source": "none"
                }
            ],
            "creationTime": 1616432509.662,
            "startTime": 1616432509.962,
            "endTime": 1616432522.307,
            "tags": {}
        }
    }

For more information, see `Experiments for AWS FIS <https://docs.aws.amazon.com/fis/latest/userguide/experiments.html>`__ in the *AWS Fault Injection Simulator User Guide*.
