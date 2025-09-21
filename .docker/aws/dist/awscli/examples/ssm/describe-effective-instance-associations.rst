**To get details of the effective associations for an instance**

The following ``describe-effective-instance-associations`` example retrieves details about the effective associations for an instance.

Command::

    aws ssm describe-effective-instance-associations --instance-id "i-1234567890abcdef0"

Output::

    {
        "Associations": [
            {
                "AssociationId": "8dfe3659-4309-493a-8755-0123456789ab",
                "InstanceId": "i-1234567890abcdef0",
                "Content": "{\n    \"schemaVersion\": \"1.2\",\n    \"description\": \"Update the Amazon SSM Agent to the latest version or specified version.\",\n    \"parameters\": {\n        \"version\": {\n            \"default\": \"\",\n            \"description\": \"(Optional) A specific version of the Amazon SSM Agent to install. If not specified, the agent will be updated to the latest version.\",\n            \"type\": \"String\"\n        },\n        \"allowDowngrade\": {\n            \"default\": \"false\",\n            \"description\": \"(Optional) Allow the Amazon SSM Agent service to be downgraded to an earlier version. If set to false, the service can be upgraded to newer versions only (default). If set to true, specify the earlier version.\",\n            \"type\": \"String\",\n            \"allowedValues\": [\n                \"true\",\n                \"false\"\n            ]\n        }\n    },\n    \"runtimeConfig\": {\n        \"aws:updateSsmAgent\": {\n            \"properties\": [\n                {\n                \"agentName\": \"amazon-ssm-agent\",\n                \"source\": \"https://s3.{Region}.amazonaws.com/amazon-ssm-{Region}/ssm-agent-manifest.json\",\n                \"allowDowngrade\": \"{{ allowDowngrade }}\",\n                \"targetVersion\": \"{{ version }}\"\n                }\n            ]\n        }\n    }\n}\n",
                "AssociationVersion": "1"
            }
        ]
    }
