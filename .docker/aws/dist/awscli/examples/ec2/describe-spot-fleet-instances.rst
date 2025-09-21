**To describe the Spot Instances associated with a Spot fleet**

This example command lists the Spot instances associated with the specified Spot fleet.

Command::

  aws ec2 describe-spot-fleet-instances --spot-fleet-request-id sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE

Output::

  {
    "ActiveInstances": [
        {
            "InstanceId": "i-1234567890abcdef0",
            "InstanceType": "m3.medium",
            "SpotInstanceRequestId": "sir-08b93456"
        },
        ...
    ],
    "SpotFleetRequestId": "sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE"
  }
