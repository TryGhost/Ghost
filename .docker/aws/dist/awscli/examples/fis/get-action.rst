**To get action details**

The following ``get-action`` example gets the details of the specified action. ::

    aws fis get-action \
        --id aws:ec2:stop-instances

Output::

    {
        "action": {
            "id": "aws:ec2:stop-instances",
            "description": "Stop the specified EC2 instances.",
            "parameters": {
                "startInstancesAfterDuration": {
                    "description": "The time to wait before restarting the instances (ISO 8601 duration).",
                    "required": false
                }
            },
            "targets": {
                "Instances": {
                    "resourceType": "aws:ec2:instance"
                }
            },
            "tags": {}
        }
    }

For more information, see `Actions <https://docs.aws.amazon.com/fis/latest/userguide/actions.html>`__ in the *AWS Fault Injection Simulator User Guide*.
