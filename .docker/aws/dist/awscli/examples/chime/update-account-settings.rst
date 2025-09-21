**To update the settings for your account**

The following ``update-account-settings`` example disables the remote control of shared screens for the specified Amazon Chime account. ::

    aws chime update-account-settings \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --account-settings DisableRemoteControl=true

This command produces no output.