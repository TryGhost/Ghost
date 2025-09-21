**To list inputs**

The following ``list-inputs`` example lists the inputs that you've created. ::

    aws iotevents list-inputs

Output::

    {
        "status": "ACTIVE", 
        "inputArn": "arn:aws:iotevents:us-west-2:123456789012:input/PressureInput", 
        "lastUpdateTime": 1551742986.768, 
        "creationTime": 1551742986.768, 
        "inputName": "PressureInput", 
        "inputDescription": "Pressure readings from a motor"
    } 

For more information, see `ListInputs <https://docs.aws.amazon.com/iotevents/latest/developerguide/iotevents-commands.html#api-iotevents-ListInputs>`__ in the *AWS IoT Events Developer Guide**.

