**To retrieve a group**

The following ``get-group`` example displays details for the specified group resource. The details include the group name, the group ARN, and the filter expression that defines the criteria for that group. Groups can also be retrieved by ARN. ::
     
    aws xray get-group \
        --group-name "AdminGroup"

Output::

    {
        "Group": [
            {
                "GroupName": "AdminGroup",
                "GroupARN": "arn:aws:xray:us-west-2:123456789012:group/AdminGroup/123456789",
                "FilterExpression": "service(\"mydomain.com\") {fault OR error}"
            }
        ]
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
