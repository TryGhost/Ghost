**To create a new version of a subscription definition**

The following ``create-subscription-definition-version`` example creates a new version of a subscription definition that contains three subscriptions: a trigger notification, a temperature input, and an output status. ::

    aws greengrass create-subscription-definition-version \
        --subscription-definition-id "9d611d57-5d5d-44bd-a3b4-feccbdd69112" \
        --subscriptions "[{\"Id\": \"TriggerNotification\", \"Source\": \"arn:aws:lambda:us-west-2:123456789012:function:TempMonitor:GG_TempMonitor\", \"Subject\": \"twilio/txt\", \"Target\": \"arn:aws:greengrass:us-west-2::/connectors/TwilioNotifications/versions/1\"},{\"Id\": \"TemperatureInput\", \"Source\": \"cloud\", \"Subject\": \"temperature/input\", \"Target\": \"arn:aws:lambda:us-west-2:123456789012:function:TempMonitor:GG_TempMonitor\"},{\"Id\": \"OutputStatus\", \"Source\": \"arn:aws:greengrass:us-west-2::/connectors/TwilioNotifications/versions/1\", \"Subject\": \"twilio/message/status\", \"Target\": \"cloud\"}]"

Output::

   {
       "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/9d611d57-5d5d-44bd-a3b4-feccbdd69112/versions/7b65dfae-50b6-4d0f-b3e0-27728bfb0620",
       "CreationTimestamp": "2019-06-24T21:21:33.837Z",
       "Id": "9d611d57-5d5d-44bd-a3b4-feccbdd69112",
       "Version": "7b65dfae-50b6-4d0f-b3e0-27728bfb0620"
   }
