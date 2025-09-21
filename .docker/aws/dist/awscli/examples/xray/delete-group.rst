**To delete a group**

The following ``delete-group`` example deletes the specified group resource. ::

    aws xray delete-group \
        --group-name "AdminGroup" \
        --group-arn "arn:aws:xray:us-east-2:123456789012:group/AdminGroup/123456789"     

This command produces no output.

For more information, see `Configuring Sampling, Groups, and Encryption Settings with the AWS X-Ray API <https://docs.aws.amazon.com/en_pv/xray/latest/devguide/xray-api-configuration.html#xray-api-configuration-sampling>`__ in the *AWS X-Ray Developer Guide*.
