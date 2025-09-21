**To retrieve information about an administrator account**

The following ``get-master-account`` example retrieves information about the administrator account for the requesting account. ::

    aws securityhub get-master-account

Output::

    {
       "Master": { 
          "AccountId": "123456789012",
          "InvitationId": "7ab938c5d52d7904ad09f9e7c20cc4eb",
          "InvitedAt": 2020-06-01T20:21:18.042000+00:00,
          "MemberStatus": "ASSOCIATED"
       }
    }

For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.
