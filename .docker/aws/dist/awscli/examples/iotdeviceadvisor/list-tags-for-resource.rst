**To list the tags attached to an IoT Device Advisor resource**

The following ``list-tags-for-resource`` example lists the tags attached to a device advisor resource. The device advisor resource can be a Suitedefinition-Arn or a Suiterun-Arn. ::

    aws iotdeviceadvisor list-tags-for-resource \
        --resource-arn arn:aws:iotdeviceadvisor:us-east-1:123456789012:suitedefinition/ba0uyjpg38ny

Output::

    {
        "tags": {
            "TestTagKey": "TestTagValue"
        }
    }

For more information, see `ListTagsForResource <https://docs.aws.amazon.com/iot/latest/apireference/API_iotdeviceadvisor_ListTagsForResource.html>`__ in the *AWS IoT API Reference* and `Resource types defined by AWS IoT Core Device Advisor <https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsiotcoredeviceadvisor.html#awsiotcoredeviceadvisor-resources-for-iam-policies>`__ in the *Service Authorization Reference*.
