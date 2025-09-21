**To roll back an instance refresh**

The following ``rollback-instance-refresh`` example rolls back an in-progress instance refresh for the specified Auto Scaling group. ::

    aws autoscaling rollback-instance-refresh \
        --auto-scaling-group-name my-asg

Output::

    {
        "InstanceRefreshId": "08b91cf7-8fa6-48af-b6a6-d227f40f1b9b"
    }

For more information, see `Undo changes with a rollback <https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.