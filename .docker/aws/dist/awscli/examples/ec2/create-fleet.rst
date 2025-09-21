**Example 1: To create an EC2 Fleet that launches Spot Instances as the default purchasing model**

The following ``create-fleet`` example creates an EC2 Fleet using the minimum parameters required to launch a fleet: a launch template, target capacity, and default purchasing model. The launch template is identified by its launch template ID and version number. The target capacity for the fleet is 2 instances, and the default purchasing model is ``spot``, which results in the fleet launching 2 Spot Instances.

When you create an EC2 Fleet, use a JSON file to specify information about the instances to launch. ::

    aws ec2 create-fleet \
        --cli-input-json file://file_name.json

Contents of file_name.json::

    {
        "LaunchTemplateConfigs": [
        {
            "LaunchTemplateSpecification": {
            "LaunchTemplateId": "lt-0e8c754449b27161c",
            "Version": "1"
            }
        }
        ],
        "TargetCapacitySpecification": {
            "TotalTargetCapacity": 2,
            "DefaultTargetCapacityType": "spot"
        }
    }

Output::

    {
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
    }

**Example 2: To create an EC2 Fleet that launches On-Demand Instances as the default purchasing model**

The following ``create-fleet`` example creates an EC2 Fleet using the minimum parameters required to launch a fleet: a launch template, target capacity, and default purchasing model. The launch template is identified by its launch template ID and version number. The target capacity for the fleet is 2 instances, and the default purchasing model is ``on-demand``, which results in the fleet launching 2 On-Demand Instances.

When you create an EC2 Fleet, use a JSON file to specify information about the instances to launch. ::

    aws ec2 create-fleet \
        --cli-input-json file://file_name.json

Contents of file_name.json::

  {
      "LaunchTemplateConfigs": [
      {
          "LaunchTemplateSpecification": {
          "LaunchTemplateId": "lt-0e8c754449b27161c",
          "Version": "1"
          }
      }
      ],
      "TargetCapacitySpecification": {
      "TotalTargetCapacity": 2,
      "DefaultTargetCapacityType": "on-demand"
      }
  }

Output::

    {
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
    }


**Example 3: To create an EC2 Fleet that launches On-Demand Instances as the primary capacity**

The following ``create-fleet`` example creates an EC2 Fleet that specifies the total target capacity of 2 instances for the fleet, and a target capacity of 1 On-Demand Instance. The default purchasing model is ``spot``. The fleet launches 1 On-Demand Instance as specified, but needs to launch one more instance to fulfil the total target capacity. The purchasing model for the difference is calculated as ``TotalTargetCapacity`` - ``OnDemandTargetCapacity`` = ``DefaultTargetCapacityType``, which results in the fleet launching 1 Spot Instance.

When you create an EC2 Fleet, use a JSON file to specify information about the instances to launch. ::

    aws ec2 create-fleet \
        --cli-input-json file://file_name.json

Contents of file_name.json::

    {
        "LaunchTemplateConfigs": [
        {
            "LaunchTemplateSpecification": {
            "LaunchTemplateId": "lt-0e8c754449b27161c",
            "Version": "1"
            }
        }
        ],
        "TargetCapacitySpecification": {
            "TotalTargetCapacity": 2,
            "OnDemandTargetCapacity":1,
            "DefaultTargetCapacityType": "spot"
        }
    }

Output::

    {
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
    }

**Example 4: To create an EC2 Fleet that launches Spot Instances using the lowest-price allocation strategy**

If the allocation strategy for Spot Instances is not specified, the default allocation strategy, which is ``lowest-price``, is used. The following ``create-fleet`` example creates an EC2 Fleet using the ``lowest-price`` allocation strategy. The three launch specifications, which override the launch template, have different instance types but the same weighted capacity and subnet. The total target capacity is 2 instances and the default purchasing model is ``spot``. The EC2 Fleet launches 2 Spot Instances using the instance type of the launch specification with the lowest price.

When you create an EC2 Fleet, use a JSON file to specify information about the instances to launch. ::

    aws ec2 create-fleet \
        --cli-input-json file://file_name.jsonContents of file_name.json::

    {
        "LaunchTemplateConfigs": [
        {
            "LaunchTemplateSpecification": {
            "LaunchTemplateId": "lt-0e8c754449b27161c",
            "Version": "1"
            },
            "Overrides": [
                {
                    "InstanceType": "c4.large",
                    "WeightedCapacity": 1,
                    "SubnetId": "subnet-a4f6c5d3"
                },
                {
                    "InstanceType": "c3.large",
                    "WeightedCapacity": 1,
                    "SubnetId": "subnet-a4f6c5d3"
                },
                {
                    "InstanceType": "c5.large",
                    "WeightedCapacity": 1,
                    "SubnetId": "subnet-a4f6c5d3"
                }
            ]
        }
        ],
        "TargetCapacitySpecification": {
            "TotalTargetCapacity": 2,
            "DefaultTargetCapacityType": "spot"
        }
    }

Output::

    {
        "FleetId": "fleet-12a34b55-67cd-8ef9-ba9b-9208dEXAMPLE"
    }