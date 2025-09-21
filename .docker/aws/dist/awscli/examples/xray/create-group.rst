**To create a group**

The following ``create-group`` example creates a group resource named ``AdminGroup``. The group gets a filter expression that defines the criteria of the group as a segment related to a specific service causing a fault or an error. ::

     aws xray create-group \
        --group-name "AdminGroup" \
        --filter-expression "service(\"mydomain.com\") {fault OR error}"

Output::

    {
        "GroupName": "AdminGroup",
        "GroupARN": "arn:aws:xray:us-west-2:123456789012:group/AdminGroup/123456789",
        "FilterExpression": "service(\"mydomain.com\") {fault OR error}"
    }

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
