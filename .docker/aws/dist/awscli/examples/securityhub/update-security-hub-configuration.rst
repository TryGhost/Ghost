**To update Security Hub configuration**

The following ``update-security-hub-configuration`` example configures Security Hub to automatically enable new controls for enabled standards. ::

    aws securityhub update-security-hub-configuration \
        --auto-enable-controls

This command produces no output.

For more information, see `Enabling new controls automatically <https://docs.aws.amazon.com/securityhub/latest/userguide/controls-auto-enable.html>`_ in the *AWS Security Hub User Guide*.
