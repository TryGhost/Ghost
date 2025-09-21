**To unsuspend multiple users**

The following ``batch-unsuspend-user`` example removes any previous suspension for the listed users on the specified Amazon Chime account. ::

    aws chime batch-unsuspend-user \
        --account-id a1b2c3d4-5678-90ab-cdef-11111EXAMPLE \
        --user-id-list "a1b2c3d4-5678-90ab-cdef-22222EXAMPLE" "a1b2c3d4-5678-90ab-cdef-33333EXAMPLE" "a1b2c3d4-5678-90ab-cdef-44444EXAMPLE"

Output::

    {
        "UserErrors": []
    }

