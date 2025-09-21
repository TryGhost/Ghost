**To start an experiment**

The following ``start-experiment`` example starts the specified experiment. ::

    aws fis start-experiment \
        --experiment-template-id ABCDE1fgHIJkLmNop

Output::

    {
        "experiment": {
            "id": "ABC12DeFGhI3jKLMNOP",
            "experimentTemplateId": "ABCDE1fgHIJkLmNop",
            "roleArn": "arn:aws:iam::123456789012:role/myRole",
            "state": {
                "status": "initiating",
                "reason": "Experiment is initiating."
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
                        "status": "pending",
                        "reason": "Initial state"
                    }
                }
            },
            "stopConditions": [
                {
                    "source": "none"
                }
            ],
            "creationTime": 1616432464.025,
            "startTime": 1616432464.374,
            "tags": {}
        }
    }

For more information, see `Experiments for AWS FIS <https://docs.aws.amazon.com/fis/latest/userguide/experiments.html>`__ in the *AWS Fault Injection Simulator User Guide*.
