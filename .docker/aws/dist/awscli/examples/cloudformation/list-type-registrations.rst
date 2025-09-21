**To list the completed registrations of a type**

The following ``list-type-registrations`` example displays a list of the completed type registrations for the specified type. ::

    aws cloudformation list-type-registrations \
        --type RESOURCE \
        --type-name My::Logs::LogGroup \
        --registration-status-filter COMPLETE

Output::

    {
        "RegistrationTokenList": [
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE11111",
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE22222",
            "a1b2c3d4-5678-90ab-cdef-EXAMPLE33333"
        ]
    }

For more information, see `Using the CloudFormation Registry <https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/registry.html>`__ in the *AWS CloudFormation Users Guide*.
