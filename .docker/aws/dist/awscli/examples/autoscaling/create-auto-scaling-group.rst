**Example 1: To create an Auto Scaling group**

The following ``create-auto-scaling-group`` example creates an Auto Scaling group in subnets in multiple Availability Zones within a Region. The instances launch with the default version of the specified launch template. Note that defaults are used for most other settings, such as the termination policies and health check configuration. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-template LaunchTemplateId=lt-1234567890abcde12 \
        --min-size 1 \
        --max-size 5 \
        --vpc-zone-identifier "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"

This command produces no output.

For more information, see `Auto Scaling groups <https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 2: To attach an Application Load Balancer, Network Load Balancer, or Gateway Load Balancer**

This example specifies the ARN of a target group for a load balancer that supports the expected traffic. The health check type specifies ``ELB`` so that when Elastic Load Balancing reports an instance as unhealthy, the Auto Scaling group replaces it. The command also defines a health check grace period of ``600`` seconds. The grace period helps prevent premature termination of newly launched instances. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-template LaunchTemplateId=lt-1234567890abcde12 \
        --target-group-arns arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/943f017f100becff \
        --health-check-type ELB \
        --health-check-grace-period 600 \
        --min-size 1 \
        --max-size 5 \
        --vpc-zone-identifier "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"

This command produces no output.

For more information, see `Elastic Load Balancing and Amazon EC2 Auto Scaling <https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 3: To specify a placement group and use the latest version of the launch template**

This example launches instances into a placement group within a single Availability Zone. This can be useful for low-latency groups with HPC workloads. This example also specifies the minimum size, maximum size, and desired capacity of the group. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-template LaunchTemplateId=lt-1234567890abcde12,Version='$Latest' \
        --min-size 1 \
        --max-size 5 \
        --desired-capacity 3 \
        --placement-group my-placement-group \
        --vpc-zone-identifier "subnet-6194ea3b"

This command produces no output.

For more information, see `Placement groups <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html>`__ in the *Amazon EC2 User Guide for Linux Instances*.

**Example 4: To specify a single instance Auto Scaling group and use a specific version of the launch template**

This example creates an Auto Scaling group with minimum and maximum capacity set to ``1`` to enforce that one instance will be running. The command also specifies v1 of a launch template in which the ID of an existing ENI is specified. When you use a launch template that specifies an existing ENI for eth0, you must specify an Availability Zone for the Auto Scaling group that matches the network interface, without also specifying a subnet ID in the request. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg-single-instance \
        --launch-template LaunchTemplateName=my-template-for-auto-scaling,Version='1' \
        --min-size 1 \
        --max-size 1 \
        --availability-zones us-west-2a

This command produces no output.

For more information, see `Auto Scaling groups <https://docs.aws.amazon.com/autoscaling/ec2/userguide/AutoScalingGroup.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 5: To specify a different termination policy**

This example creates an Auto Scaling group using a launch configuration and sets the termination policy to terminate the oldest instances first. The command also applies a tag to the group and its instances, with a key of ``Role`` and a value of ``WebServer``. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg \
        --launch-configuration-name my-lc \
        --min-size 1 \
        --max-size 5 \
        --termination-policies "OldestInstance" \
        --tags "ResourceId=my-asg,ResourceType=auto-scaling-group,Key=Role,Value=WebServer,PropagateAtLaunch=true" \
        --vpc-zone-identifier "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"

This command produces no output.

For more information, see `Working with Amazon EC2 Auto Scaling termination policies <https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 6: To specify a launch lifecycle hook**

This example creates an Auto Scaling group with a lifecycle hook that supports a custom action at instance launch. ::

    aws autoscaling create-auto-scaling-group \
        --cli-input-json file://~/config.json

Contents of ``config.json`` file::

    {
        "AutoScalingGroupName": "my-asg",
        "LaunchTemplate": {
            "LaunchTemplateId": "lt-1234567890abcde12"
        },
        "LifecycleHookSpecificationList": [{
            "LifecycleHookName": "my-launch-hook",
            "LifecycleTransition": "autoscaling:EC2_INSTANCE_LAUNCHING",
            "NotificationTargetARN": "arn:aws:sqs:us-west-2:123456789012:my-sqs-queue",
            "RoleARN": "arn:aws:iam::123456789012:role/my-notification-role",
            "NotificationMetadata": "SQS message metadata",
            "HeartbeatTimeout": 4800,
            "DefaultResult": "ABANDON"
        }],
        "MinSize": 1,
        "MaxSize": 5,
        "VPCZoneIdentifier": "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782",
        "Tags": [{
            "ResourceType": "auto-scaling-group",
            "ResourceId": "my-asg",
            "PropagateAtLaunch": true,
            "Value": "test",
            "Key": "environment"
        }]
    }

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 7: To specify a termination lifecycle hook**

This example creates an Auto Scaling group with a lifecycle hook that supports a custom action at instance termination. ::

    aws autoscaling create-auto-scaling-group \
        --cli-input-json file://~/config.json

Contents of ``config.json``::

    {
        "AutoScalingGroupName": "my-asg",
        "LaunchTemplate": {
            "LaunchTemplateId": "lt-1234567890abcde12"
        },
        "LifecycleHookSpecificationList": [{
            "LifecycleHookName": "my-termination-hook",
            "LifecycleTransition": "autoscaling:EC2_INSTANCE_TERMINATING",
            "HeartbeatTimeout": 120,
            "DefaultResult": "CONTINUE"
        }],
        "MinSize": 1,
        "MaxSize": 5,
        "TargetGroupARNs": [
            "arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/73e2d6bc24d8a067"
        ],
        "VPCZoneIdentifier": "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"
    }

This command produces no output.

For more information, see `Amazon EC2 Auto Scaling lifecycle hooks <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.

**Example 8: To specify a custom termination policy**

This example creates an Auto Scaling group that specifies a custom Lambda function termination policy that tells Amazon EC2 Auto Scaling which instances are safe to terminate on scale in. ::

    aws autoscaling create-auto-scaling-group \
        --auto-scaling-group-name my-asg-single-instance \
        --launch-template LaunchTemplateName=my-template-for-auto-scaling \
        --min-size 1 \
        --max-size 5 \
        --termination-policies "arn:aws:lambda:us-west-2:123456789012:function:HelloFunction:prod" \    
        --vpc-zone-identifier "subnet-5ea0c127,subnet-6194ea3b,subnet-c934b782"

This command produces no output.

For more information, see `Creating a custom termination policy with Lambda <https://docs.aws.amazon.com/autoscaling/ec2/userguide/lambda-custom-termination-policy.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.