**To delete a provisioning template version**

The following ``delete-provisioning-template-version`` example deletes version 2 of the specified provisioning template. :: 

    aws iot delete-provisioning-template-version \
        --version-id 2 \
        --template-name "widget-template"

This command produces no output.

For more information, see `AWS IoT Secure Tunneling <https://docs.aws.amazon.com/iot/latest/developerguide/secure-tunneling.html>`__ in the *AWS IoT Core Developer Guide*.
