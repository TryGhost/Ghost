**To execute a scaling policy**

This example executes the scaling policy named ``my-step-scale-out-policy`` for the specified Auto Scaling group. ::

    aws autoscaling execute-policy \
        --auto-scaling-group-name my-asg \
        --policy-name  my-step-scale-out-policy \
        --metric-value 95 \
        --breach-threshold 80

This command produces no output.

For more information, see `Step and simple scaling policies <https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html>`_ in the *Amazon EC2 Auto Scaling User Guide*.
