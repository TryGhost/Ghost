**To associate sign-in delegate groups**

The following ``associate-signin-delegate-groups-with-account`` example associates the specified sign-in delegate group with the specified Amazon Chime account. ::

    aws chime associate-signin-delegate-groups-with-account \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --signin-delegate-groups GroupName=my_users

This command produces no output.

For more information, see `Managing User Access and Permissions <https://docs.aws.amazon.com/chime/latest/ag/manage-access.html>`__ in the *Amazon Chime Administration Guide*.
