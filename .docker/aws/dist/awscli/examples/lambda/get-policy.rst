**To retrieve the resource-based IAM policy for a function, version, or alias**

The following ``get-policy`` example displays policy information about the ``my-function`` Lambda function. ::

    aws lambda get-policy \
        --function-name my-function

Output::

    {
        "Policy": {
            "Version":"2012-10-17",
            "Id":"default",
            "Statement":
            [
                {
                    "Sid":"iot-events",
                    "Effect":"Allow",
                    "Principal": {"Service":"iotevents.amazonaws.com"},
                    "Action":"lambda:InvokeFunction",
                    "Resource":"arn:aws:lambda:us-west-2:123456789012:function:my-function"
                }
            ]
        },
        "RevisionId": "93017fc9-59cb-41dc-901b-4845ce4bf668"
    }

For more information, see `Using Resource-based Policies for AWS Lambda <https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html>`__ in the *AWS Lambda Developer Guide*.
