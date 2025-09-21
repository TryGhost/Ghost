**To specify the level of logging**

The following ``put-logging-options`` example enables ``INFO`` level logging in AWS IoT SiteWise. Other levels include ``DEBUG`` and ``OFF``. ::

    aws iotsitewise put-logging-options \
        --logging-options level=INFO

This command produces no output.

For more information, see `Monitoring AWS IoT SiteWise with Amazon CloudWatch Logs <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/monitor-cloudwatch-logs.html>`__ in the *AWS IoT SiteWise User Guide*.