**To list webhooks**

The following ``list-webhooks`` example retrieves a list of all tags attached to the specified pipeline resource. ::

    aws codepipeline list-webhooks \
        --endpoint-url "https://codepipeline.eu-central-1.amazonaws.com" \
        --region "eu-central-1"

Output::

    {
        "webhooks": [
            {
                "url": "https://webhooks.domain.com/trigger111111111EXAMPLE11111111111111111": {
                    "authenticationConfiguration": {
                        "SecretToken": "Secret"
                    },
                    "name": "my-webhook",
                    "authentication": "GITHUB_HMAC",
                    "targetPipeline": "my-Pipeline",
                    "targetAction": "Source",
                    "filters": [
                        {
                            "jsonPath": "$.ref",
                            "matchEquals": "refs/heads/{Branch}"
                        }
                    ]
                },
                "arn": "arn:aws:codepipeline:eu-central-1:123456789012:webhook:my-webhook"
            }
        ]
    }

For more information, see `List webhooks in your account <https://docs.aws.amazon.com/codepipeline/latest/userguide/appendix-github-oauth.html#pipelines-webhooks-view>`__ in the *AWS CodePipeline User Guide*.