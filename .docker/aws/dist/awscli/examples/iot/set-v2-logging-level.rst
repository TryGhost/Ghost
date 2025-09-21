**To set the logging level for a thing group**

The following ``set-v2-logging-level`` example sets the logging level to log warnings for the specified thing group. ::

    aws iot set-v2-logging-level \
        --log-target "{\"targetType\":\"THING_GROUP\",\"targetName\":\"LightBulbs\"}" \
        --log-level WARN


This command produces no output.
