**To list all AWS AppConfig extensions in your AWS account for an AWS Region**

The following ``list-extensions`` example lists all AWS AppConfig extensions for the current AWS account in a specific AWS Region. The command returns custom and AWS authored extensions. ::

    aws appconfig list-extensions \
        --region us-west-2 

Output::

    {
        "Items": [
            {
                "Id": "1A2B3C4D",
                "Name": "S3-backup-extension",
                "VersionNumber": 1,
                "Arn": "arn:aws:appconfig:us-west-2:123456789012:extension/1A2B3C4D/1"
            },
            {
                "Id": "AWS.AppConfig.FeatureFlags",
                "Name": "AppConfig Feature Flags Helper",
                "VersionNumber": 1,
                "Arn": "arn:aws:appconfig:us-west-2::extension/AWS.AppConfig.FeatureFlags/1",
                "Description": "Validates AppConfig feature flag data automatically against a JSON schema that includes structure and constraints. Also transforms feature flag data prior to sending to the client. This extension is automatically associated to configuration profiles with type \"AWS.AppConfig.FeatureFlags\"."
            },
            {
                "Id": "AWS.AppConfig.JiraIntegration",
                "Name": "AppConfig integration with Atlassian Jira",
                "VersionNumber": 1,
                "Arn": "arn:aws:appconfig:us-west-2::extension/AWS.AppConfig.JiraIntegration/1",
                "Description": "Exports feature flag data from AWS AppConfig into Jira. The lifecycle of each feature flag in AppConfig is tracked in Jira as an individual issue. Customers can see in Jira when flags are updated, turned on or off. Works in conjunction with the AppConfig app in the Atlassian Marketplace and is automatically associated to configuration profiles configured within that app."
            },
            {
                "Id": "AWS.AppConfig.DeploymentNotificationsToEventBridge",
                "Name": "AppConfig deployment events to Amazon EventBridge",
                "VersionNumber": 1,
                "Arn": "arn:aws:appconfig:us-west-2::extension/AWS.AppConfig.DeploymentNotificationsToEventBridge/1",
                "Description": "Sends events to Amazon EventBridge when a deployment of configuration data in AppConfig is started, completed, or rolled back. Can be associated to the following resources in AppConfig: Application, Environment, Configuration Profile."
            },
            {
                "Id": "AWS.AppConfig.DeploymentNotificationsToSqs",
                "Name": "AppConfig deployment events to Amazon SQS",
                "VersionNumber": 1,
                "Arn": "arn:aws:appconfig:us-west-2::extension/AWS.AppConfig.DeploymentNotificationsToSqs/1",
                "Description": "Sends messages to the configured Amazon SQS queue when a deployment of configuration data in AppConfig is started, completed, or rolled back. Can be associated to the following resources in AppConfig: Application, Environment, Configuration Profile."
            },
            {
                "Id": "AWS.AppConfig.DeploymentNotificationsToSns",
                "Name": "AppConfig deployment events to Amazon SNS",
                "VersionNumber": 1,
                "Description": "Sends events to the configured Amazon SNS topic when a deployment of configuration data in AppConfig is started, completed, or rolled back. Can be associated to the following resources in AppConfig: Application, Environment, Configuration Profile."
            }
        ]
    }

For more information, see `Working with AWS AppConfig extensions <https://docs.aws.amazon.com/appconfig/latest/userguide/working-with-appconfig-extensions.html>`__ in the *AWS AppConfig User Guide*.
