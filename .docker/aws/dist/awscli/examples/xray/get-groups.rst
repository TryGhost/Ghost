**To retrieve all groups**

The following example displays details for all active group. ::
   
   aws xray get-groups
   
Output::

    {
        "Groups": [
            {
                "GroupName": "AdminGroup",
                "GroupARN": "arn:aws:xray:us-west-2:123456789012:group/AdminGroup/123456789",
                "FilterExpression": "service(\"example.com\") {fault OR error}"
            },
            {
                "GroupName": "SDETGroup",
                "GroupARN": "arn:aws:xray:us-west-2:123456789012:group/SDETGroup/987654321",
                "FilterExpression": "responsetime > 2"
            }
        ]
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
