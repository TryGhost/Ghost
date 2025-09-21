**To list logging levels**

The following ``list-v2-logging-levels`` example lists the configured logging levels. If logging levels were not set, a ``NotConfiguredException`` occurs when you run this command. ::

    aws iot list-v2-logging-levels

Output::

    {
        "logTargetConfigurations": [
            {
                "logTarget": {
                    "targetType": "DEFAULT"
                },
                "logLevel": "ERROR"
            }
        ]
    }
