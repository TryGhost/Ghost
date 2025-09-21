**To set the logging options**

The following ``set-v2-logging-options`` example sets the default logging verbosity level to ERROR and specifies the ARN to use for logging. ::

    aws iot set-v2-logging-options \
        --default-log-level ERROR \
        --role-arn "arn:aws:iam::094249569039:role/service-role/iotLoggingRole"

This command produces no output.
