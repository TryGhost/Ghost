**To get status information for the delivery channel**

The following command returns the status of the delivery channel::

    aws configservice describe-delivery-channel-status

Output::

    {
        "DeliveryChannelsStatus": [
            {
                "configStreamDeliveryInfo": {
                    "lastStatusChangeTime": 1452193834.381,
                    "lastStatus": "SUCCESS"
                },
                "configHistoryDeliveryInfo": {
                    "lastSuccessfulTime": 1450317838.412,
                    "lastStatus": "SUCCESS",
                    "lastAttemptTime": 1450317838.412
                },
                "configSnapshotDeliveryInfo": {
                    "lastSuccessfulTime": 1452185597.094,
                    "lastStatus": "SUCCESS",
                    "lastAttemptTime": 1452185597.094
                },
                "name": "default"
            }
        ]
    }