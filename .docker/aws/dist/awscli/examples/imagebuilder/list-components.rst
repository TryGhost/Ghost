**To list all of the component semantic versions**

The following ``list-components`` example lists all of the component semantic versions to which you have access. You can optionally filter on whether to list components owned by you, by Amazon, or that have been shared with you by other accounts. ::

    aws imagebuilder list-components

Output::

    {
        "requestId": "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
        "componentVersionList": [
            {
                "arn": "arn:aws:imagebuilder:us-west-2:123456789012:component/component-name/1.0.0",
                "name": "component-name",
                "version": "1.0.0",
                "platform": "Linux",
                "type": "TEST",
                "owner": "123456789012",
                "dateCreated": "2020-01-27T20:43:30.306Z"
            }
        ]
    }

For more information, see `Setting Up and Managing an EC2 Image Builder Image Pipeline Using the AWS CLI <https://docs.aws.amazon.com/imagebuilder/latest/userguide/managing-image-builder-cli.html>`__ in the *EC2 Image Builder Users Guide*.
