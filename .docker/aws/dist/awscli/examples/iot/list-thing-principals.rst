**To list the principals associated with a thing**

The following ``list-thing-principals`` example lists the principals (X.509 certificates, IAM users, groups, roles, Amazon Cognito identities, or federated identities) associated with the specified thing. ::

    aws iot list-thing-principals \
        --thing-name MyRaspberryPi
        
Output::

    {
        "principals": [
            "arn:aws:iot:us-west-2:123456789012:cert/33475ac865079a5ffd5ecd44240640349293facc760642d7d8d5dbb6b4c86893"
        ]
    }

For more information, see `ListThingPrincipals <https://docs.aws.amazon.com/iot/latest/apireference/API_ListThingPrincipals.html>`__ in the *AWS IoT API Reference*.
