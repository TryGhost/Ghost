**To retrieve a list of credentials**

The following ``list-service-specific-credentials`` example lists the credentials generated for HTTPS access to AWS CodeCommit repositories for a user named ``developer``. ::

    aws iam list-service-specific-credentials \
        --user-name developer \
        --service-name codecommit.amazonaws.com

Output::

    {
        "ServiceSpecificCredentials": [
            {
                "UserName": "developer",
                "Status": "Inactive",
                "ServiceUserName": "developer-at-123456789012",
                "CreateDate": "2019-10-01T04:31:41Z",
                "ServiceSpecificCredentialId": "ACCAQFODXMPL4YFHP7DZE",
                "ServiceName": "codecommit.amazonaws.com"
            },
            {
                "UserName": "developer",
                "Status": "Active",
                "ServiceUserName": "developer+1-at-123456789012",
                "CreateDate": "2019-10-01T04:31:45Z",
                "ServiceSpecificCredentialId": "ACCAQFOXMPL6VW57M7AJP",
                "ServiceName": "codecommit.amazonaws.com"
            }
        ]
    }

For more information, see `Create Git credentials for HTTPS connections to CodeCommit <https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html#setting-up-gc-iam>`__ in the *AWS CodeCommit User Guide*.