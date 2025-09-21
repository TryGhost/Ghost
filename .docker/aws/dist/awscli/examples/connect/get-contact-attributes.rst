**To retrieve the attributes for a contact**

The following ``get-contact-attributes`` example retrieves the attributes that were set for the specified Amazon Connect contact. ::

    aws connect get-contact-attributes \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --initial-contact-id 12345678-1111-2222-800e-a2b3c4d5f6g7

Output::

    {
        "Attributes": {
            "greetingPlayed": "true"
        }
    }

For more information, see `Use Amazon Connect Contact Attributes <https://docs.aws.amazon.com/connect/latest/adminguide/connect-contact-attributes.html>`__ in the *Amazon Connect Administrator Guide*.
