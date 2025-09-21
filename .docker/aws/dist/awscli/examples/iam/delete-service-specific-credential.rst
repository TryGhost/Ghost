**Example 1: Delete a service-specific credential for the requesting user**

The following ``delete-service-specific-credential`` example deletes the specified service-specific credential for the user making the request. The ``service-specific-credential-id`` is provided when you create the credential and you can retrieve it by using the ``list-service-specific-credentials`` command. ::

    aws iam delete-service-specific-credential \
        --service-specific-credential-id ACCAEXAMPLE123EXAMPLE

This command produces no output.

**Example 2: Delete a service-specific credential for a specified user**

The following ``delete-service-specific-credential`` example deletes the specified service-specific credential for the specified user. The ``service-specific-credential-id`` is provided when you create the credential and you can retrieve it by using the ``list-service-specific-credentials`` command. ::

    aws iam delete-service-specific-credential \
        --user-name sofia \
        --service-specific-credential-id ACCAEXAMPLE123EXAMPLE

This command produces no output.

For more information, see `Create Git credentials for HTTPS connections to CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html#setting-up-gc-iam>`__ in the *AWS CodeCommit User Guide*.