**To create a connector definition version**

The following ``create-connector-definition-version`` example creates a connector definition version and associates it with the specified connector definition. All connectors in a version define values for their parameters. ::

    aws greengrass create-connector-definition-version \
        --connector-definition-id "55d0052b-0d7d-44d6-b56f-21867215e118" \
        --connectors "[{\"Id\": \"MyTwilioNotificationsConnector\", \"ConnectorArn\": \"arn:aws:greengrass:us-west-2::/connectors/TwilioNotifications/versions/2\", \"Parameters\": {\"TWILIO_ACCOUNT_SID\": \"AC1a8d4204890840d7fc482aab38090d57\", \"TwilioAuthTokenSecretArn\": \"arn:aws:secretsmanager:us-west-2:123456789012:secret:greengrass-TwilioAuthToken-ntSlp6\", \"TwilioAuthTokenSecretArn-ResourceId\": \"TwilioAuthToken\", \"DefaultFromPhoneNumber\": \"4254492999\"}}]"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/connectors/55d0052b-0d7d-44d6-b56f-21867215e118/versions/33f709a0-c825-49cb-9eea-dc8964fbd635",
        "CreationTimestamp": "2019-06-24T20:46:30.134Z",
        "Id": "55d0052b-0d7d-44d6-b56f-21867215e118",
        "Version": "33f709a0-c825-49cb-9eea-dc8964fbd635"
    }
