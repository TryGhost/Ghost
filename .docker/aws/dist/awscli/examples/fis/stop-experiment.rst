**To stop an experiment**

The following ``stop-experiment`` example stops the specified experiment from running. ::

    aws fis stop-experiment \
        --id ABC12DeFGhI3jKLMNOP

Output::

    {
        "experiment": {
            "id": "ABC12DeFGhI3jKLMNOP",
            "experimentTemplateId": "ABCDE1fgHIJkLmNop",
            "roleArn": "arn:aws:iam::123456789012:role/myRole",
            "state": {
                "status": "stopping",
                "reason": "Stopping Experiment."
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
                    "startAfter": [
                        "wait"
                    ],
                    "state": {
                        "status": "pending",
                        "reason": "Initial state."
                    }
                },
                "wait": {
                    "actionId": "aws:fis:wait",
                    "parameters": {
                        "duration": "PT5M"
                    },
                    "state": {
                        "status": "running",
                        "reason": ""
                    }
                }
            },
            "stopConditions": [
                {
                    "source": "none"
                }
            ],
            "creationTime": 1616432680.927,
            "startTime": 1616432681.177,
            "tags": {}
        }
    }

For more information, see `Experiments for AWS FIS <https://docs.aws.amazon.com/fis/latest/userguide/experiments.html>`__ in the *AWS Fault Injection Simulator User Guide*.
