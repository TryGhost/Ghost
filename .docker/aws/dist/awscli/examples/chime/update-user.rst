**To update user details**

This example updates the specified details for the specified user.

Command::

    aws chime update-user \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --user-id a1b2c3d4-5678-90ab-cdef-22222EXAMPLE \
        --license-type "Basic"

Output::

    {
        "User": {
            "UserId": "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE"
        }
    }
