**To delete a signing certificate for an IAM user**

The following ``delete-signing-certificate`` command deletes the specified signing certificate for the IAM user named ``Bob``. ::

    aws iam delete-signing-certificate \
        --user-name Bob \
        --certificate-id TA7SMP42TDN5Z26OBPJE7EXAMPLE

This command produces no output.

To get the ID for a signing certificate, use the ``list-signing-certificates`` command.

For more information, see `Manage signing certificates <https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/set-up-ami-tools.html#ami-tools-managing-certs>`__ in the *Amazon EC2 User Guide*.