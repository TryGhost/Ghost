**To get the Amazon SES Easy DKIM attributes for a list of identities**

The following example uses the ``get-identity-dkim-attributes`` command to retrieve the Amazon SES Easy DKIM attributes for a list of identities::

    aws ses get-identity-dkim-attributes --identities "example.com" "user@example.com"

Output::

 {
    "DkimAttributes": {
        "example.com": {
            "DkimTokens": [
                "EXAMPLEjcs5xoyqytjsotsijas7236gr",
                "EXAMPLEjr76cvoc6mysspnioorxsn6ep",
                "EXAMPLEkbmkqkhlm2lyz77ppkulerm4k"
            ],
            "DkimEnabled": true,
            "DkimVerificationStatus": "Success"
        },
        "user@example.com": {
            "DkimEnabled": false,
            "DkimVerificationStatus": "NotStarted"
        }
    }
 }

If you call this command with an identity that you have never submitted for verification, that identity won't appear in the output.

For more information about Easy DKIM, see `Easy DKIM in Amazon SES`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Easy DKIM in Amazon SES`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/easy-dkim.html
