**To disable the RootCredentialsManagement feature in your organization**

The following ``disable-organizations-root-credentials-management`` command disables the management of privileged root user credentials across member accounts in your organization. ::

    aws iam disable-organizations-root-credentials-management

Output::

    {
        "EnabledFeatures": [
            "RootSessions"
        ]
        "OrganizationId": "o-aa111bb222"
    }

For more information, see `Centralize root access for member accounts <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-enable-root-access.html>`__ in the *AWS IAM User Guide*.g