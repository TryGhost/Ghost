**To suspend multiple users**

The following ``batch-suspend-user`` example suspends the listed users from the specified Amazon Chime account. ::

    aws chime batch-suspend-user \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --user-id-list "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE" "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE" "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE"

Output::

    {
        "UserErrors": []
    }
