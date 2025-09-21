**To get the Amazon SES verification status for a list of identities**

The following example uses the ``get-identity-verification-attributes`` command to retrieve the Amazon SES verification status for a list of identities::

    aws ses get-identity-verification-attributes --identities "user1@example.com" "user2@example.com"

Output::

 {
    "VerificationAttributes": {
        "user1@example.com": {
            "VerificationStatus": "Success"
        },
        "user2@example.com": {
            "VerificationStatus": "Pending"
        }
    }
 }

If you call this command with an identity that you have never submitted for verification, that identity won't appear in the output.

For more information about verified identities, see `Verifying Email Addresses and Domains in Amazon SES`_ in the *Amazon Simple Email Service Developer Guide*.

.. _`Verifying Email Addresses and Domains in Amazon SES`: http://docs.aws.amazon.com/ses/latest/DeveloperGuide/verify-addresses-and-domains.html
