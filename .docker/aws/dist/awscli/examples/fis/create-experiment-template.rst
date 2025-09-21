**To create an experiment template**

The following ``create-experiment-template`` example creates an experiment template in your AWS FIS account. ::

    aws fis create-experiment-template \ 
        --cli-input-json file://myfile.json

Contents of ``myfile.json``::

    {
        "description": "experimentTemplate",
        "stopConditions": [
            {
                "source": "aws:cloudwatch:alarm",
                "value": "arn:aws:cloudwatch:us-west-2:123456789012:alarm:alarmName"
            }
        ],
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
                "description": "reboot",
                "parameters": {},
                "targets": {
                    "Instances": "Instances-Target-1"
                }
            }
        },
        "roleArn": "arn:aws:iam::123456789012:role/myRole"
    }

Output::

    {
        "experimentTemplate": {
            "id": "ABCDE1fgHIJkLmNop",
            "description": "experimentTemplate",
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
                    "description": "reboot",
                    "parameters": {},
                    "targets": {
                        "Instances": "Instances-Target-1"
                    }
                }
            },
            "stopConditions": [
                {
                    "source": "aws:cloudwatch:alarm",
                    "value": "arn:aws:cloudwatch:us-west-2:123456789012:alarm:alarmName"
                }
            ],
            "creationTime": 1616434850.659,
            "lastUpdateTime": 1616434850.659,
            "roleArn": "arn:aws:iam::123456789012:role/myRole",
            "tags": {}
        }
    }

For more information, see `Create an experiment template <https://docs.aws.amazon.com/fis/latest/userguide/working-with-templates.html#create-template>`__ in the *AWS Fault Injection Simulator User Guide*.
