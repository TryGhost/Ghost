**To resume suspended processes**

This example resumes the specified suspended scaling process for the specified Auto Scaling group. ::

    aws autoscaling resume-processes \
        --auto-scaling-group-name my-asg \
        --scaling-processes AlarmNotification

This command produces no output.

For more information, see `Suspending and resuming scaling processes <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html>`__ in the *Amazon EC2 Auto Scaling User Guide*.
