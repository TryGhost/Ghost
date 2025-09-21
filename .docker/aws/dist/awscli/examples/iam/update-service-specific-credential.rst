**Example 1: To update the status of the requesting user's service-specific credential**

The following ``update-service-specific-credential`` example changes the status for the specified credential for the user making the request to ``Inactive``. ::

    aws iam update-service-specific-credential \
        --service-specific-credential-id ACCAEXAMPLE123EXAMPLE \
        --status Inactive

This command produces no output.

**Example 2: To update the status of a specified user's service-specific credential**

The following ``update-service-specific-credential`` example changes the status for the credential of the specified user to Inactive. ::

    aws iam update-service-specific-credential \
        --user-name sofia \
        --service-specific-credential-id ACCAEXAMPLE123EXAMPLE \
        --status Inactive

This command produces no output.

For more information, see `Create Git Credentials for HTTPS Connections to CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html#setting-up-gc-iam>`__ in the *AWS CodeCommit User Guide*
