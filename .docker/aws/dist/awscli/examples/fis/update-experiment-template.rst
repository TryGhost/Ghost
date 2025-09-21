**To update an experiment template**

The following ``update-experiment-template`` example updates the description of the specified experiment template. ::

    aws fis update-experiment-template \
        --id ABCDE1fgHIJkLmNop \
        ---description myExperimentTemplate

Output::

    {
        "experimentTemplate": {
            "id": "ABCDE1fgHIJkLmNop",
            "description": "myExperimentTemplate",
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
                "testaction": {
                    "actionId": "aws:ec2:stop-instances",
                    "parameters": {},
                    "targets": {
                        "Instances": "Instances-Target-1"
                    }
                }
            },
            "stopConditions": [
                {
                    "source": "none"
                }
            ],
            "creationTime": 1616017191.124,
            "lastUpdateTime": 1616017859.607,
            "roleArn": "arn:aws:iam::123456789012:role/FISRole",
            "tags": {
                "key": "value"
            }
        }
    }

For more information, see `Update an experiment template <https://docs.aws.amazon.com/fis/latest/userguide/working-with-templates.html#update-template>`__ in the *AWS Fault Injection Simulator User Guide*.