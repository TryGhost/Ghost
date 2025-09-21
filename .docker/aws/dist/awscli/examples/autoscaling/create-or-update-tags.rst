**To create or update tags for an Auto Scaling group**

This example adds two tags to the specified Auto Scaling group. ::

    aws autoscaling create-or-update-tags \
        --tags ResourceId=my-asg,ResourceType=auto-scaling-group,Key=Role,Value=WebServer,PropagateAtLaunch=true ResourceId=my-asg,ResourceType=auto-scaling-group,Key=Dept,Value=Research,PropagateAtLaunch=true

This command produces no output.

For more information, see `Tagging Auto Scaling groups and instances <https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-tagging.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.