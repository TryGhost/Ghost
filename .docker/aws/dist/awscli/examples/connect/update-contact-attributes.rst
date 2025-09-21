**To update a contact's attribute**

The following ``update-contact-attributes`` example updates the ``greetingPlayed`` attribute for the specified Amazon Connect user. ::

    aws connect update-contact-attributes \
        --initial-contact-id 11111111-2222-3333-4444-12345678910 \
        --instance-id a1b2c3d4-5678-90ab-cdef-EXAMPLE11111 \
        --attributes greetingPlayed=false
        
This command produces no output.

For more information, see `Use Amazon Connect Contact Attributes <https://docs.aws.amazon.com/connect/latest/adminguide/connect-contact-attributes.html>`__ in the *Amazon Connect Administrator Guide*.
