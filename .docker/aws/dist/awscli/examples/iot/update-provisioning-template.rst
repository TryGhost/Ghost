**To update a provisioning template**

The following ``update-provisioning-template`` example modifies the description and role arn for the specified provisioning template and enables the template. ::

    aws iot update-provisioning-template \
        --template-name widget-template \
        --enabled \
        --description "An updated provisioning template for widgets" \
        --provisioning-role-arn arn:aws:iam::504350838278:role/Provision_role

This command produces no output.

For more information, see `AWS IoT Secure Tunneling <https://docs.aws.amazon.com/iot/latest/developerguide/secure-tunneling.html>`__ in the *AWS IoT Core Developer Guide*.
