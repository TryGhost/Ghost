**To get a list of event types for a notification rule**

The following ``list-event-types`` example retrieves a filtered list of all available notification event types for CodeDeploy applications. If instead you use no filter, the command returns all notification event types for all resource types. ::

    aws codestar-notifications list-event-types \
        --filters Name=SERVICE_NAME,Value=CodeDeploy

Output::

    {
        "EventTypes": [
            {
                "EventTypeId": "codedeploy-application-deployment-succeeded",
                "ServiceName": "CodeDeploy",
                "EventTypeName": "Deployment: Succeeded",
                "ResourceType": "Application"
            },
            {
                "EventTypeId": "codedeploy-application-deployment-failed",
                "ServiceName": "CodeDeploy",
                "EventTypeName": "Deployment: Failed",
                "ResourceType": "Application"
            },
            {
                "EventTypeId": "codedeploy-application-deployment-started",
                "ServiceName": "CodeDeploy",
                "EventTypeName": "Deployment: Started",
                "ResourceType": "Application"
            }
        ]
    }

For more information, see `Create a Notification Rule <https://docs.aws.amazon.com/codestar-notifications/latest/userguide/notification-rule-create.html>`__ in the *AWS Developer Tools Console User Guide*.
