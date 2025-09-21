**Example 1: To revert a secret to the previous version**

The following ``update-secret-version-stage`` example moves the AWSCURRENT staging label to the previous version of a secret, which reverts the secret to the previous version. To find the ID for the previous version, use ``list-secret-version-ids``. For this example, the version with the AWSCURRENT label is a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 and the version with the AWSPREVIOUS label is a1b2c3d4-5678-90ab-cdef-EXAMPLE22222. In this example, you move the AWSCURRENT label from version 11111 to 22222. Because the AWSCURRENT label is removed from a version, ``update-secret-version-stage`` automatically moves the AWSPREVIOUS label to that version (11111). The effect is that the AWSCURRENT and AWSPREVIOUS versions are swapped. ::

    aws secretsmanager update-secret-version-stage \
        --secret-id MyTestSecret \
        --version-stage AWSCURRENT \
        --move-to-version-id a1b2c3d4-5678-90ab-cdef-EXAMPLE22222 \
        --remove-from-version-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Version <https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version>`__ in the *Secrets Manager User Guide*.

**Example 2: To add a staging label attached to a version of a secret**

The following ``update-secret-version-stage`` example adds a staging label to a version of a secret. You can review the results by running ``list-secret-version-ids`` and viewing the ``VersionStages`` response field for the affected version. ::

    aws secretsmanager update-secret-version-stage \
        --secret-id MyTestSecret \
        --version-stage STAGINGLABEL1 \
        --move-to-version-id EXAMPLE1-90ab-cdef-fedc-ba987EXAMPLE

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Version <https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version>`__ in the *Secrets Manager User Guide*.

**Example 3: To delete a staging label attached to a version of a secret**

The following ``update-secret-version-stage`` example deletes a staging label that is attached to a version of a secret. You can review the results by running ``list-secret-version-ids`` and viewing the ``VersionStages`` response field for the affected version. ::

    aws secretsmanager update-secret-version-stage \
        --secret-id MyTestSecret \
        --version-stage STAGINGLABEL1 \
        --remove-from-version-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111

Output::

    {
        "ARN": "arn:aws:secretsmanager:us-west-2:123456789012:secret:MyTestSecret-a1b2c3",
        "Name": "MyTestSecret"
    }

For more information, see `Version <https://docs.aws.amazon.com/secretsmanager/latest/userguide/getting-started.html#term_version>`__ in the *Secrets Manager User Guide*.