**To update a group**

The following ``update-group`` example updates the criteria by which to accept traces into the group named ``AdminGroup``. You can specify the desired group by using either the group name or group ARN. ::

    aws xray update-group \
        --group-name "AdminGroup" \
        --group-arn "arn:aws:xray:us-west-2:123456789012:group/AdminGroup/123456789" \
        --filter-expression "service(\"mydomain.com\") {fault}"
	
Output::

    {
        "GroupName": "AdminGroup",
        "GroupARN": "arn:aws:xray:us-east-2:123456789012:group/AdminGroup/123456789",
        "FilterExpression": "service(\"mydomain.com\") {fault}"
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
