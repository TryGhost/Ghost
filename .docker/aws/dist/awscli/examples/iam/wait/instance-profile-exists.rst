**To pause running until the specified instance profile exists**

The following ``wait instance-profile-exists`` command pauses and continues only after it can confirm that the specified instance profile exists. ::

    aws iam wait instance-profile-exists \
        --instance-profile-name WebServer

This command produces no output.