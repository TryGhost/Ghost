**To retrieve information about application revisions**

The following ``batch-get-application-revisions`` example retrieves information about the specified revision stored in a GitHub repository. ::

    aws deploy batch-get-application-revisions \
        --application-name my-codedeploy-application \
        --revisions "[{\"gitHubLocation\": {\"commitId\": \"fa85936EXAMPLEa31736c051f10d77297EXAMPLE\",\"repository\": \"my-github-token/my-repository\"},\"revisionType\": \"GitHub\"}]"

Output::

    {
        "revisions": [
            {
                "genericRevisionInfo": {
                    "description": "Application revision registered by Deployment ID: d-A1B2C3111",
                    "lastUsedTime": 1556912355.884,
                    "registerTime": 1556912355.884,
                    "firstUsedTime": 1556912355.884,
                    "deploymentGroups": []
                },
                "revisionLocation": {
                    "revisionType": "GitHub",
                    "gitHubLocation": {
                        "commitId": "fa85936EXAMPLEa31736c051f10d77297EXAMPLE",
                        "repository": "my-github-token/my-repository"
                    }
                }
            }
        ],
        "applicationName": "my-codedeploy-application",
        "errorMessage": ""
    }

For more information, see `BatchGetApplicationRevisions <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_BatchGetApplicationRevisions.html>`_ in the *AWS CodeDeploy API Reference*.
