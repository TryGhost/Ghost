**To disable the RootSessions feature in your organization**

The following ``disable-organizations-root-sessions`` command disables root user sessions for privileged tasks across member accounts in your organization. ::

    aws iam disable-organizations-root-sessions

Output::

    {
        "EnabledFeatures": [
            "RootCredentialsManagement"
        ]
        "OrganizationId": "o-aa111bb222"
    }

For more information, see `Centralize root access for member accounts <https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-enable-root-access.html>`__ in the *AWS IAM User Guide*.
