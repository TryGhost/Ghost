**To send SMS message using the endpoint of an application**

The following ``send-messages`` example sends a direct message for an application with an endpoint. ::

    aws pinpoint send-messages \
        --application-id 611e3e3cdd47474c9c1399a505665b91 \
        --message-request file://myfile.json \
        --region us-west-2

Contents of ``myfile.json``::

    {
        "MessageConfiguration": {
            "SMSMessage": {
                "Body": "hello, how are you?"
            }
        },
        "Endpoints": {
            "testendpoint": {}
        }
    }

Output::

    {
        "MessageResponse": {
            "ApplicationId": "611e3e3cdd47474c9c1399a505665b91",
            "EndpointResult": {
                "testendpoint": {
                    "Address": "+12345678900",
                    "DeliveryStatus": "SUCCESSFUL",
                    "MessageId": "itnuqhai5alf1n6ahv3udc05n7hhddr6gb3lq6g0",
                    "StatusCode": 200,
                    "StatusMessage": "MessageId: itnuqhai5alf1n6ahv3udc05n7hhddr6gb3lq6g0"
                }
            },
            "RequestId": "c7e23264-04b2-4a46-b800-d24923f74753"
        }
    }

For more information, see `Amazon Pinpoint SMS channel <https://docs.aws.amazon.com/pinpoint/latest/userguide/channels-sms.html>`__ in the *Amazon Pinpoint User Guide*.