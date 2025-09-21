**To delete a scheduled action**

The follwing ``delete-scheduled-action`` example deletes the specified scheduled action from the specified Amazon AppStream 2.0 fleet::

    aws application-autoscaling delete-scheduled-action \
        --service-namespace appstream \
        --scalable-dimension appstream:fleet:DesiredCapacity \
        --resource-id fleet/sample-fleet \
        --scheduled-action-name my-recurring-action

This command produces no output.

For more information, see `Scheduled Scaling  <https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-scheduled-scaling.html>`__ in the *Application Auto Scaling User Guide*.
