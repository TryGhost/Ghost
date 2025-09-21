**To get component details**

The following ``get-component`` example lists the details of a component by specifying its ARN. ::

    aws imagebuilder get-component \
        --component-build-version-arn arn:aws:imagebuilder:us-west-2:123456789012:component/component-name/1.0.0/1

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "component": {
            "arn": "arn:aws:imagebuilder:us-west-2:123456789012:component/component-name/1.0.0/1",
            "name": "component-name",
            "version": "1.0.0",
            "type": "TEST",
            "platform": "Linux",
            "owner": "123456789012",
            "data": "name: HelloWorldTestingDocument\ndescription: This is hello world testing document.\nschemaVersion: 1.0\n\nphases:\n  - name: test\n    steps:\n      - name: HelloWorldStep\n        action: ExecuteBash\n        inputs:\n          commands:\n            - echo \"Hello World! Test.\"\n",
            "encrypted": true,
            "dateCreated": "2020-01-27T20:43:30.306Z",
            "tags": {}
        }
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
