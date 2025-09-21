**To list a Device Defender's ML Detect Security Profile training model's status**

The following ``get-behavior-model-training-summaries`` example lists model training status for the configured behaviors in the chosen Security Profile. For each behavior, the name, model status, and percentage of datapoints collected are listed. ::

    aws iot get-behavior-model-training-summaries \
        --security-profile-name MySecuirtyProfileName

Output::

    {
        "summaries": [
            {
                "securityProfileName": "MySecuirtyProfileName",
                "behaviorName": "Messages_sent_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            },
            {
                "securityProfileName": "MySecuirtyProfileName",
                "behaviorName": "Messages_received_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            },
            {
                "securityProfileName": "MySecuirtyProfileName",
                "behaviorName": "Authorization_failures_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            },
            {
                "securityProfileName": "MySecuirtyProfileName",
                "behaviorName": "Message_size_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            },
            {
                "securityProfileName": "MySecuirtyProfileName",
                "behaviorName": "Connection_attempts_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            },
            {
                "securityProfileName": "MySPNoALerts",
                "behaviorName": "Disconnects_ML_behavior",
                "modelStatus": "PENDING_BUILD",
                "datapointsCollectionPercentage": 0.0
            }
        ]
    }

For more information, see `GetBehaviorModelTrainingSummaries (Detect Commands) <https://docs.aws.amazon.com/iot/latest/developerguide/detect-commands.html>`__ in the *AWS IoT Developer Guide*.