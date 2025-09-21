**To retrieve the current AWS IoT SiteWise logging options**

The following ``describe-logging-options`` example retrieves the current AWS IoT SiteWise logging options for your AWS account in the current Region. ::

    aws iotsitewise describe-logging-options

Output::

    {
        "loggingOptions": {
            "level": "INFO"
        }
    }

For more information, see `Monitoring AWS IoT SiteWise with Amazon CloudWatch Logs <https://docs.aws.amazon.com/iot-sitewise/latest/userguide/monitor-cloudwatch-logs.html>`__ in the *AWS IoT SiteWise User Guide*.