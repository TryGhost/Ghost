**To check the status of a request to delete a service-linked role**

The following ``get-service-linked-role-deletion-status`` example displays the status of a previously request to delete a service-linked role. The delete operation occurs asynchronously. When you make the request, you get a ``DeletionTaskId`` value that you provide as a parameter for this command. ::

    aws iam get-service-linked-role-deletion-status \
        --deletion-task-id task/aws-service-role/lex.amazonaws.com/AWSServiceRoleForLexBots/1a2b3c4d-1234-abcd-7890-abcdeEXAMPLE

Output::

    {
    "Status": "SUCCEEDED"
    }

For more information, see `Using service-linked roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/using-service-linked-roles.html>`__ in the *AWS IAM User Guide*.