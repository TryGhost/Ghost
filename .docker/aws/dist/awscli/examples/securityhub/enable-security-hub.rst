**To enable AWS Security Hub**

The following ``enable-security-hub`` example enables AWS Security Hub for the requesting account. It configures Security Hub to enable the default standards. For the hub resource, it assigns the value ``Security`` to the tag ``Department``. ::

    aws securityhub enable-security-hub \
        --enable-default-standards \
        --tags '{"Department": "Security"}'

This command produces no output.

For more information, see `Enabling Security Hub <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-settingup.html#securityhub-enable>`__ in the *AWS Security Hub User Guide*.
