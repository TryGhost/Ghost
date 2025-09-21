**To create a managed compute environment with On-Demand instances**

This example creates a managed compute environment with specific C4 instance types that are launched on demand. The compute environment is called `C4OnDemand`.

Command::

  aws batch create-compute-environment --cli-input-json file://<path_to_json_file>/C4OnDemand.json
  
JSON file format::

  {
    "computeEnvironmentName": "C4OnDemand",
    "type": "MANAGED",
    "state": "ENABLED",
    "computeResources": {
      "type": "EC2",
      "minvCpus": 0,
      "maxvCpus": 128,
      "desiredvCpus": 48,
      "instanceTypes": [
        "c4.large",
        "c4.xlarge",
        "c4.2xlarge",
        "c4.4xlarge",
        "c4.8xlarge"
      ],
      "subnets": [
        "subnet-220c0e0a",
        "subnet-1a95556d",
        "subnet-978f6dce"
      ],
      "securityGroupIds": [
        "sg-cf5093b2"
      ],
      "ec2KeyPair": "id_rsa",
      "instanceRole": "ecsInstanceRole",
      "tags": {
        "Name": "Batch Instance - C4OnDemand"
      }
    },
    "serviceRole": "arn:aws:iam::012345678910:role/AWSBatchServiceRole"
  }

Output::

  {
      "computeEnvironmentName": "C4OnDemand",
      "computeEnvironmentArn": "arn:aws:batch:us-east-1:012345678910:compute-environment/C4OnDemand"
  }

**To create a managed compute environment with Spot Instances**

This example creates a managed compute environment with the M4 instance type that is launched when the Spot bid price is at or below 20% of the On-Demand price for the instance type. The compute environment is called `M4Spot`.

Command::

  aws batch create-compute-environment --cli-input-json file://<path_to_json_file>/M4Spot.json
  
JSON file format::

  {
    "computeEnvironmentName": "M4Spot",
    "type": "MANAGED",
    "state": "ENABLED",
    "computeResources": {
      "type": "SPOT",
      "spotIamFleetRole": "arn:aws:iam::012345678910:role/aws-ec2-spot-fleet-role",
      "minvCpus": 0,
      "maxvCpus": 128,
      "desiredvCpus": 4,
      "instanceTypes": [
        "m4"
      ],
      "bidPercentage": 20,
      "subnets": [
        "subnet-220c0e0a",
        "subnet-1a95556d",
        "subnet-978f6dce"
      ],
      "securityGroupIds": [
        "sg-cf5093b2"
      ],
      "ec2KeyPair": "id_rsa",
      "instanceRole": "ecsInstanceRole",
      "tags": {
        "Name": "Batch Instance - M4Spot"
      }
    },
    "serviceRole": "arn:aws:iam::012345678910:role/AWSBatchServiceRole"
  }

Output::

  {
      "computeEnvironmentName": "M4Spot",
      "computeEnvironmentArn": "arn:aws:batch:us-east-1:012345678910:compute-environment/M4Spot"
  }
