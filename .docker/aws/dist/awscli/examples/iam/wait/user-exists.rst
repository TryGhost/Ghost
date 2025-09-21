**To pause running until the specified user exists**

The following ``wait user-exists`` command pauses and continues only after it can confirm that the specified user exists. ::

    aws iam wait user-exists \
        --user-name marcia

This command produces no output.