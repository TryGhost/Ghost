**To retrieve the number of invitations that were not accepted**

The following ``get-invitations-count`` example retrieves the number of invitations that the requesting account declined or did not respond to. ::

    aws securityhub get-invitations-count

Output::

    {
      "InvitationsCount": 3
    }


For more information, see `Managing administrator and member accounts <https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html>`__ in the *AWS Security Hub User Guide*.
