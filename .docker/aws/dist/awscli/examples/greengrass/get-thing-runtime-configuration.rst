**To retrieve the runtime configuration of a Greengrass core**

The following ``get-thing-runtime-configuration`` example retrieves the runtime configuration of a Greengrass core. Before you can retrieve the runtime configuration, you must use the ``update-thing-runtime-configuration`` command to create a runtime configuration for the core. ::

    aws greengrass get-thing-runtime-configuration \
        --thing-name SampleGreengrassCore

Output::

    {
        "RuntimeConfiguration": {
            "TelemetryConfiguration": {
                "ConfigurationSyncStatus": "OutOfSync",
                "Telemetry": "On"
            }
        }
    }

For more information, see `Configuring telemetry settings <https://docs.aws.amazon.com/greengrass/latest/developerguide/telemetry.html#configure-telemetry-settings>`__ in the *AWS IoT Greengrass Developer Guide*.