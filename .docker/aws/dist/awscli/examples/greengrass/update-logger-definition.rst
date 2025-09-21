**To update a logger definition**

The following ``update-logger-definition`` example changes the name of the specified logger definition. You can only update the ``name`` property of a logger definition. ::

    aws greengrass update-logger-definition \
        --logger-definition-id "a454b62a-5d56-4ca9-bdc4-8254e1662cb0" \
        --name "LoggingConfigsForSensors"

This command produces no output.

For more information, see `Monitoring with AWS IoT Greengrass Logs <https://docs.aws.amazon.com/greengrass/latest/developerguide/greengrass-logs-overview.html>`__ in the *AWS IoT Greengrass Developer Guide*.
