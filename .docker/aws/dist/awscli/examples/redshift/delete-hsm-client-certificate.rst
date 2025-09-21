**To delete HSM client certificate**

The following ``delete-hsm-client-certificate`` example deletes an HSM client certificate. ::

    aws redshift delete-hsm-client-certificate \
        --hsm-client-certificate-identifier myhsmclientcert

This command does not produce any output.

For more information, see `Amazon Redshift API Permissions Reference <https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-policy-resources.resource-permissions.html>`__ in the *Amazon Redshift Cluster Management Guide*.
