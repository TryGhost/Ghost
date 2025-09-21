**To enable the RootCredentialsManagement feature in your organization**

The following ``enable-organizations-root-credentials-management`` command enables the management of privileged root user credentials across member accounts in your organization. ::

    aws iam enable-organizations-root-credentials-management

Output::

    {
        "EnabledFeatures": [
            "RootCredentialsManagement"
        ]
        "OrganizationId": "o-aa111bb222"
    }

For more information, see `Centralize root access for member accounts <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-enable-root-access.html>`__ in the *AWS IAM User Guide*.