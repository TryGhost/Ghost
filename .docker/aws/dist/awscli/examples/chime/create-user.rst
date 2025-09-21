**To create a user profile for a shared device**

The following ``create-user`` example creates a shared device profile for the specified email address. ::

    aws chime create-user \
        --account-id 12a3456b-7c89-012d-3456-78901e23fg45 \
        --email roomdevice@example.com \
        --user-type SharedDevice

Output::

    {
        "User": {
            "UserId": "1ab2345c-67de-8901-f23g-45h678901j2k",
            "AccountId": "12a3456b-7c89-012d-3456-78901e23fg45",
            "PrimaryEmail": "roomdevice@example.com",
            "DisplayName": "Room Device",
            "LicenseType": "Pro",
            "UserType": "SharedDevice",
            "UserRegistrationStatus": "Registered",
            "RegisteredOn": "2020-01-15T22:38:09.806Z",
            "AlexaForBusinessMetadata": {
                "IsAlexaForBusinessEnabled": false
            }
        }
    }

For more information, see `Preparing for Setup <https://docs.aws.amazon.com/chime/latest/ag/prepare-setup.html>`__ in the *Amazon Chime Administration Guide*.
