**To activate or deactivate a signing certificate for an IAM user**

The following ``update-signing-certificate`` command deactivates the specified signing certificate for the IAM user named ``Bob``. ::

    aws iam update-signing-certificate \
        --certificate-id TA7SMP42TDN5Z26OBPJE7EXAMPLE \
        --status Inactive \
        --user-name Bob

To get the ID for a signing certificate, use the ``list-signing-certificates`` command.

For more information, see `Manage signing certificates <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-up-ami-tools.html#ami-tools-managing-certs>`__ in the *Amazon EC2 User Guide*.