**Example 1: List the service-specific credentials for a user**

The following ``list-service-specific-credentials`` example displays all service-specific credentials assigned to the specified user. Passwords are not included in the response. ::

    aws iam list-service-specific-credentials \
        --user-name sofia

Output::

    {
        "ServiceSpecificCredential": {
            "CreateDate": "2019-04-18T20:45:36+00:00",
            "ServiceName": "codecommit.amazonaws.com",
            "ServiceUserName": "sofia-at-123456789012",
            "ServiceSpecificCredentialId": "ACCAEXAMPLE123EXAMPLE",
            "UserName": "sofia",
            "Status": "Active"
        }
    }

**Example 2: List the service-specific credentials for a user filtered to a specified service**

The following ``list-service-specific-credentials`` example displays the service-specific credentials assigned to the user making the request. The list is filtered to include only those credentials for the specified service. Passwords are not included in the response. ::

    aws iam list-service-specific-credentials \
        --service-name codecommit.amazonaws.com

Output::

    {
        "ServiceSpecificCredential": {
            "CreateDate": "2019-04-18T20:45:36+00:00",
            "ServiceName": "codecommit.amazonaws.com",
            "ServiceUserName": "sofia-at-123456789012",
            "ServiceSpecificCredentialId": "ACCAEXAMPLE123EXAMPLE",
            "UserName": "sofia",
            "Status": "Active"
        }
    }

For more information, see `Create Git credentials for HTTPS connections to CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html#setting-up-gc-iam>`__ in the *AWS CodeCommit User Guide*.