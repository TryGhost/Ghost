**To set the default version for a policy**

The following ``set-default-policy-version`` example sets the default version to ``2`` for the policy named ``UpdateDeviceCertPolicy``. ::

    aws iot set-default-policy-version \
        --policy-name UpdateDeviceCertPolicy \
        --policy-version-id 2

This command produces no output.
