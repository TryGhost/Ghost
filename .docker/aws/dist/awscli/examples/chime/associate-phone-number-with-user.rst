**To associate a phone number with a user**

The following ``associate-phone-number-with-user`` example associates the specified phone number with a user. ::

    aws chime associate-phone-number-with-user \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --user-id 1ab2345c-67de-8901-f23g-45h678901j2k \
        --e164-phone-number "+12065550100"

This command produces no output.

For more information, see `Managing User Phone Numbers <https://docs.aws.amazon.com/chime/latest/ag/user-phone.html>`__ in the *Amazon Chime Administration Guide*.
