**To create a certificate authority (CA) for a group**

The following ``create-group-certificate-authority`` example creates or rotates a CA for the specified group. ::

    aws greengrass create-group-certificate-authority \
        --group-id "8eaadd72-ce4b-4f15-892a-0cc4f3a343f1"

Output::

    {
        "GroupCertificateAuthorityArn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/8eaadd72-ce4b-4f15-892a-0cc4f3a343f1/certificateauthorities/d31630d674c4437f6c5dbc0dca56312a902171ce2d086c38e509c8EXAMPLEcc5"
    }

For more information, see `AWS IoT Greengrass Security <https://docs.aws.amazon.com/greengrass/latest/developerguide/gg-sec.html>`__ in the *AWS IoT Greengrass Developer Guide*.
