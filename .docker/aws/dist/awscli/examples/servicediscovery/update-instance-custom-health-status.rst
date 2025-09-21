**To update a custom health check**

The following ``update-instance-custom-health-status`` example updates the status of the custom health check for the specified service and example service instance to ``HEALTHY``. ::

    aws servicediscovery update-instance-custom-health-status \
        --service-id srv-e4anhexample0004 \
        --instance-id example \
        --status HEALTHY

This command produces no output.

For more information, see `AWS Cloud Map service health check configuration <https://docs.aws.amazon.com/cloud-map/latest/dg/services-health-checks.html>`__ in the *AWS Cloud Map Developer Guide*.
