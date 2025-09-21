**To remove a custom source.**

The following ``delete-custom-logsource`` example deletes a custom source in the designated log provider account in the designated Region. ::

    aws securitylake delete-custom-log-source \
        --source-name "CustomSourceName"

This command produces no output.

For more information, see `Deleting a custom source <https://docs.aws.amazon.com/security-lake/latest/userguide/custom-sources.html#delete-custom-source>`__ in the *Amazon Security Lake User Guide*.