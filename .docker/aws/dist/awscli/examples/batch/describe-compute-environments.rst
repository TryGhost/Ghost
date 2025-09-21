**To describe a compute environment**

This example describes the `P2OnDemand` compute environment.

Command::

  aws batch describe-compute-environments --compute-environments P2OnDemand

Output::

	{
	    "computeEnvironments": [
	        {
	            "status": "VALID",
	            "serviceRole": "arn:aws:iam::012345678910:role/AWSBatchServiceRole",
	            "computeEnvironmentArn": "arn:aws:batch:us-east-1:012345678910:compute-environment/P2OnDemand",
	            "computeResources": {
	                "subnets": [
	                    "subnet-220c0e0a",
	                    "subnet-1a95556d",
	                    "subnet-978f6dce"
	                ],
	                "tags": {
	                    "Name": "Batch Instance - P2OnDemand"
	                },
	                "desiredvCpus": 48,
	                "minvCpus": 0,
	                "instanceTypes": [
	                    "p2"
	                ],
	                "securityGroupIds": [
	                    "sg-cf5093b2"
	                ],
	                "instanceRole": "ecsInstanceRole",
	                "maxvCpus": 128,
	                "type": "EC2",
	                "ec2KeyPair": "id_rsa"
	            },
	            "statusReason": "ComputeEnvironment Healthy",
	            "ecsClusterArn": "arn:aws:ecs:us-east-1:012345678910:cluster/P2OnDemand_Batch_2c06f29d-d1fe-3a49-879d-42394c86effc",
	            "state": "ENABLED",
	            "computeEnvironmentName": "P2OnDemand",
	            "type": "MANAGED"
	        }
	    ]
	}
