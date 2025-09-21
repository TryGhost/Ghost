**To create a webhook**

The following ``put-webhook`` example creates a webhook for a GitHub version 1 source action. After you create the webhook, you must use the register-webhook-with-third-party command to register it. ::

    aws codepipeline put-webhook \
        --cli-input-json file://webhook_json.json \
        --region "eu-central-1"

Contents of ``webhook_json.json``::

    {
        "webhook": {
            "name": "my-webhook",
            "targetPipeline": "pipeline_name",
            "targetAction": "source_action_name",
            "filters": [
                {
                    "jsonPath": "$.ref",
                    "matchEquals": "refs/heads/{Branch}"
                }
            ],
            "authentication": "GITHUB_HMAC",
            "authenticationConfiguration": {
                "SecretToken": "secret"
            }
        }
    }

Output::

    {
        "webhook": {
            "url": "https://webhooks.domain.com/trigger111111111EXAMPLE11111111111111111",
            "definition": {
                "authenticationConfiguration": {
                    "SecretToken": "secret"
                },
                "name": "my-webhook",
                "authentication": "GITHUB_HMAC",
                "targetPipeline": "pipeline_name",
                "targetAction": "Source",
                "filters": [
                    {
                        "jsonPath": "$.ref",
                        "matchEquals": "refs/heads/{Branch}"
                    }
                ]
            },
            "arn": "arn:aws:codepipeline:eu-central-1:123456789012:webhook:my-webhook"
        },
        "tags": [
            {
                "key": "Project",
                "value": "ProjectA"
            }
        ]
    }

For more information, see `Create a webhook for a GitHub source <https://docs.aws.amazon.com/codepipeline/latest/userguide/appendix-github-oauth.html#pipelines-webhooks-create>`__ in the *AWS CodePipeline User Guide*.