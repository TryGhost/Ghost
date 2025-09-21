**To turn on telemetry in the runtime configuration of a Greengrass core**

The following ``update-thing-runtime-configuration`` example updates the runtime configuration of a Greengrass core to turn on telemetry. ::

    aws greengrass update-thing-runtime-configuration \
        --thing-name SampleGreengrassCore \
        --telemetry-configuration {\"Telemetry\":\"On\"}

This command produces no output.

For more information, see `Configuring telemetry settings <https://docs.aws.amazon.com/greengrass/latest/developerguide/telemetry.html#configure-telemetry-settings>`__ in the *AWS IoT Greengrass Developer Guide*.