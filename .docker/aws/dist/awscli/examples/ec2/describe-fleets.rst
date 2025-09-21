**To describe an EC2 Fleet**

The following ``describe-fleets`` example describes the specified EC2 Fleet. ::

    aws ec2 describe-fleets \
        --fleet-ids fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE

Output::

    {
        "Fleets": [
            {
                "ActivityStatus": "pending_fulfillment",
                "CreateTime": "2020-09-01T18:26:05.000Z",
                "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE",
                "FleetState": "active",
                "ExcessCapacityTerminationPolicy": "termination",
                "FulfilledCapacity": 0.0,
                "FulfilledOnDemandCapacity": 0.0,
                "LaunchTemplateConfigs": [
                    {
                        "LaunchTemplateSpecification": {
                            "LaunchTemplateId": "lt-0e632f2855a979cd5",
                            "Version": "1"
                        }
                    }
                ],
                "TargetCapacitySpecification": {
                    "TotalTargetCapacity": 2,
                    "OnDemandTargetCapacity": 0,
                    "SpotTargetCapacity": 2,
                    "DefaultTargetCapacityType": "spot"
                },
                "TerminateInstancesWithExpiration": false,
                "Type": "maintain",
                "ReplaceUnhealthyInstances": false,
                "SpotOptions": {
                    "AllocationStrategy": "lowestPrice",
                    "InstanceInterruptionBehavior": "terminate",
                    "InstancePoolsToUseCount": 1
                },
                "OnDemandOptions": {
                    "AllocationStrategy": "lowestPrice"
                }
            }
        ]
    }

For more information, see `Managing an EC2 Fleet <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-ec2-fleet.html>`__ in the *Amazon Elastic Compute Cloud User Guide for Linux Instances*.