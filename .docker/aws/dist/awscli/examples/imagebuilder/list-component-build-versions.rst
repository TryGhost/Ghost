**To list component build versions**

The following ``list-component-build-versions`` example lists the component build versions with a specific semantic version. ::

    aws imagebuilder list-component-build-versions --component-version-arn arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "componentSummaryList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myexamplecomponent/2019.12.02/1",
                "name": "MyExampleComponent",
                "version": "2019.12.02",
                "platform": "Windows",
                "type": "BUILD",
                "owner": "123456789012",
                "description": "An example component that builds, validates and tests an image",
                "changeDescription": "Initial version.",
                "dateCreated": "2020-02-19T18:53:45.940Z",
                "tags": {
                    "KeyName": "KeyValue"
                }
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
