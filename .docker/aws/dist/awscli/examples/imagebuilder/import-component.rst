**To import a component**

The following ``import-component`` example imports a preexisting script using a JSON file. ::

    aws imagebuilder import-component \
        --cli-input-json file://import-component.json

Contents of ``import-component.json``::

    {
        "name": "MyImportedComponent",
        "semanticVersion": "1.0.0",
        "description": "An example of how to import a component",
        "changeDescription": "First commit message.",
        "format": "SHELL",
        "platform": "Windows",
        "type": "BUILD",
        "uri": "s3://s3-bucket-name/s3-bucket-path/component.yaml"
    }

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "clientToken": "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
        "componentBuildVersionArn": "arn:aws:imagebuilder:us-west-2:123456789012:component/myimportedcomponent/1.0.0/1"
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
