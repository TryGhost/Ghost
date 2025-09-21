**Example 1: To update the size limits of an Auto Scaling group**

This example updates the specified Auto Scaling group with a minimum size of 2 and a maximum size of 10. ::

    aws autoscaling update-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --min-size 2 \
        --max-size 10

This command produces no output.

For more information, see `Setting capacity limits for your Auto Scaling group <https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-capacity-limits.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To add Elastic Load Balancing health checks and specify which Availability Zones and subnets to use**

This example updates the specified Auto Scaling group to add Elastic Load Balancing health checks. This command also updates the value of ``--vpc-zone-identifier`` with a list of subnet IDs in multiple Availability Zones. ::

    aws autoscaling update-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --health-check-type ELB \
        --health-check-grace-period 600 \
        --vpc-zone-identifier "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"

This command produces no output.

For more information, see `Elastic Load Balancing and Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 3: To update the placement group and termination policy**

This example updates the placement group and termination policy to use. ::

    aws autoscaling update-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --placement-group my-placement-group \
        --termination-policies "OldestInstance" 

This command produces no output.

For more information, see `Auto Scaling groups <https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 4: To use the latest version of the launch template**

This example updates the specified Auto Scaling group to use the latest version of the specified launch template. ::

    aws autoscaling update-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-template LaunchTemplateId=lt-1234567890abcde12,Version='$Latest'

This command produces no output.

For more information, see `Launch templates <https://docs.aws.amazon.com/autoscaling/ec2/userguide/LaunchTemplates.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 5: To use a specific version of the launch template**

This example updates the specified Auto Scaling group to use a specific version of a launch template instead of the latest or default version. ::

    aws autoscaling update-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-template LaunchTemplateName=my-template-for-auto-scaling,Version='2'

This command produces no output.

For more information, see `Launch templates <https://docs.aws.amazon.com/autoscaling/ec2/userguide/LaunchTemplates.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 6: To define a mixed instances policy and enable capacity rebalancing**

This example updates the specified Auto Scaling group to use a mixed instances policy and enables capacity rebalancing. This structure lets you specify groups with Spot and On-Demand capacities and use different launch templates for different architectures. ::

    aws autoscaling update-auto-scaling-group \
        --cli-input-json file://~/config.json 

Contents of ``config.json``::

    {
        "AutoScalingGroupName": "my-asg",
        "CapacityRebalance": true,
        "MixedInstancesPolicy": {
            "LaunchTemplate": {
                "LaunchTemplateSpecification": {
                    "LaunchTemplateName": "my-launch-template-for-x86",
                    "Version": "$Latest"
                },
                "Overrides": [
                    {
                        "InstanceType": "c6g.large",
                        "LaunchTemplateSpecification": {
                            "LaunchTemplateName": "my-launch-template-for-arm",
                            "Version": "$Latest"
                        }
                    },
                    {
                        "InstanceType": "c5.large"
                    },
                    {
                        "InstanceType": "c5a.large"
                    }
                ]
            },
            "InstancesDistribution": {
                "OnDemandPercentageAboveBaseCapacity": 50,
                "SpotAllocationStrategy": "capacity-optimized"
            }
        }
    }

This command produces no output.

For more information, see `Auto Scaling groups with multiple instance types and purchase options <https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-purchase-options.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.