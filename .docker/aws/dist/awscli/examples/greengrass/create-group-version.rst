**To create a version of a Greengrass group**

The following ``create-group-version`` example creates a group version and associates it with the specified group. The version references the core, resource, connector, function, and subscription versions that contain the entities to include in this group version. You must create these entities before you can create the group version. 

* To create a resource definition with an initial version, use the ``create-resource-definition`` command. 

* To create a connector definition with an initial version, use the ``create-connector-definition`` command. 

* To create a function definition with an initial version, use the ``create-function-definition`` command. 

* To create a subscription definition with an initial version, use the ``create-subscription-definition`` command. 

* To retrieve the ARN of the latest core definition version, use the ``get-group-version`` command and specify the ID of the latest group version. ::

    aws greengrass create-group-version \
        --group-id "ce2e7d01-3240-4c24-b8e6-f6f6e7a9eeca" \
        --core-definition-version-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/6a630442-8708-4838-ad36-eb98849d975e/versions/6c87151b-1fb4-4cb2-8b31-6ee715d8f8ba" \
        --resource-definition-version-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/c8bb9ebc-c3fd-40a4-9c6a-568d75569d38/versions/a5f94d0b-f6bc-40f4-bb78-7a1c5fe13ba1" \
        --connector-definition-version-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/connectors/55d0052b-0d7d-44d6-b56f-21867215e118/versions/78a3331b-895d-489b-8823-17b4f9f418a0" \
        --function-definition-version-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/3b0d0080-87e7-48c6-b182-503ec743a08b/versions/67f918b9-efb4-40b0-b87c-de8c9faf085b" \
        --subscription-definition-version-arn "arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/9d611d57-5d5d-44bd-a3b4-feccbdd69112/versions/aa645c47-ac90-420d-9091-8c7ffa4f103f"

Output::

    {
        "Arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/ce2e7d01-3240-4c24-b8e6-f6f6e7a9eeca/versions/e10b0459-4345-4a09-88a4-1af1f5d34638",
        "CreationTimestamp": "2019-06-20T18:42:47.020Z",
        "Id": "ce2e7d01-3240-4c24-b8e6-f6f6e7a9eeca",
        "Version": "e10b0459-4345-4a09-88a4-1af1f5d34638"
    }

For more information, see `Overview of the AWS IoT Greengrass Group Object Model <https://docs.aws.amazon.com/greengrass/latest/developerguide/deployments.html#api-overview>`__ in the *AWS IoT Greengrass Developer Guide*.
