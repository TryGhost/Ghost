**Example 1: To generate an access report for a root in an organization**

The following ``generate-organizations-access-report`` example starts a background job to create an access report for the specified root in an organization. You can display the report after it's created by running the ``get-organizations-access-report`` command. ::

    aws iam generate-organizations-access-report \
        --entity-path o-4fxmplt198/r-c3xb

Output::

    {
        "JobId": "a8b6c06f-aaa4-8xmp-28bc-81da71836359"
    }

**Example 2: To generate an access report for an account in an organization**

The following ``generate-organizations-access-report`` example starts a background job to create an access report for account ID ``123456789012`` in the organization ``o-4fxmplt198``. You can display the report after it's created by running the ``get-organizations-access-report`` command. ::

    aws iam generate-organizations-access-report \
        --entity-path o-4fxmplt198/r-c3xb/123456789012

Output::

    {
        "JobId": "14b6c071-75f6-2xmp-fb77-faf6fb4201d2"
    }

**Example 3: To generate an access report for an account in an organizational unit in an organization**

The following ``generate-organizations-access-report`` example starts a background job to create an access report for account ID ``234567890123`` in organizational unit ``ou-c3xb-lmu7j2yg`` in the organization ``o-4fxmplt198``. You can display the report after it's created by running the ``get-organizations-access-report`` command. ::

    aws iam generate-organizations-access-report \
        --entity-path o-4fxmplt198/r-c3xb/ou-c3xb-lmu7j2yg/234567890123

Output::

    {
        "JobId": "2eb6c2e6-0xmp-ec04-1425-c937916a64af"
    }

To get details about roots and organizational units in your organization, use the ``organizations list-roots`` and ``organizations list-organizational-units-for-parent`` commands.

For more information, see `Refining permissions in AWS using last accessed information <https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_access-advisor.html>`__ in the *AWS IAM User Guide*.