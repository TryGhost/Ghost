**To list inputs**

The following ``list-inputs`` example lists the inputs you have created in your account. ::

    aws iotevents list-inputs

This command produces no output.
Output::

    {
        {
            "status": "ACTIVE", 
            "inputArn": "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput", 
            "lastUpdateTime": 1551742986.768, 
            "creationTime": 1551742986.768, 
            "inputName": "PressureInput", 
            "inputDescription": "Pressure readings from a motor"
        } 
    }

For more information, see `ListInputs <https://docs.aws.amazon.com/iotevents/latest/apireference/API_ListInputs>`__ in the *AWS IoT Events API Reference*.
