**To start the configuration recorder**

The following command starts the default configuration recorder::

    aws configservice start-configuration-recorder --configuration-recorder-name default

If the command succeeds, AWS Config returns no output. To verify that AWS Config is recording your resources, run the `get-status`__ command.

.. __: http://docs.aws.amazon.com/cli/latest/reference/configservice/get-status.html
