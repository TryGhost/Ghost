**Example 1: To share an application publicly**

The following ``put-application-policy`` shares an application publicly, so anyone can find and deploy your application in the AWS Serverless Application Repository. ::

    aws serverlessrepo put-application-policy \
        --application-id arn:aws:serverlessrepo:us-east-1:123456789012:applications/my-test-application \
        --statements Principals='*',Actions=Deploy

Output::

    {
        "Statements": [
            {
                "Actions": [
                    "Deploy"
                ],
                "Principals": [
                    ""
                ],
                "StatementId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
            }
        ]
    }  

**Example 2:** To share an application privately

The following ``put-application-policy`` shares an application privately, so only specific AWS accounts can find and deploy your application in the AWS Serverless Application Repository. ::

    aws serverlessrepo put-application-policy \
        --application-id arn:aws:serverlessrepo:us-east-1:123456789012:applications/my-test-application \
        --statements Principals=111111111111,222222222222,Actions=Deploy

Output::

    {
        "Statements": [
            {
                "Actions": [
                    "Deploy"
                ],
                "Principals": [
                    "111111111111",
                    "222222222222"
                ],
                "StatementId": "a1b2c3d4-5678-90ab-cdef-11111EXAMPLE"
            }
        ]
    }

For more information, see `Sharing an Application Through the Console <https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-publish.html#share-application>`_ in the *AWS Serverless Application Repository Developer Guide*
