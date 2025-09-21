**To add to and modify the existing tags of an IoT Device Advisor resource**

The following ``tag-resource`` example adds to and modifies the existing tags of a device advisor resource with the specified resource arn and tags. The device advisor resource can be a Suitedefinition-Arn or a Suiterun-Arn. ::

    aws iotdeviceadvisor tag-resource \
        --resource-arn arn:aws:iotdeviceadvisor:us-east-1:123456789012:suitedefinition/ba0uyjpg38ny \
        --tags '{"TagKey": "TagValue"}'

This command produces no output.

For more information, see `TagResource <https://docs.aws.amazon.com/iot/latest/apireference/API_iotdeviceadvisor_TagResource.html>`__ in the *AWS IoT API Reference* and `Resource types defined by AWS IoT Core Device Advisor <https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsiotcoredeviceadvisor.html#awsiotcoredeviceadvisor-resources-for-iam-policies>`__ in the *Service Authorization Reference*.
