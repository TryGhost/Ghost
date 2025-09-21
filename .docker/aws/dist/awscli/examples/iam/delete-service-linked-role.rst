**To delete a service-linked role**

The following ``delete-service-linked-role`` example deletes the specified service-linked role that you no longer need. The deletion happens asynchronously. You can check the status of the deletion and confirm when it is done by using the ``get-service-linked-role-deletion-status`` command. ::

    aws iam delete-service-linked-role \
        --role-name AWSServiceRoleForLexBots

Output::

    {
        "DeletionTaskId": "task/aws-service-role/lex.amazonaws.com/AWSServiceRoleForLexBots/1a2b3c4d-1234-abcd-7890-abcdeEXAMPLE"
    }

For more information, see `Using service-linked roles <https://docs.aws.amazon.com/IAM/latest/UserGuide/using-service-linked-roles.html>`__ in the *AWS IAM User Guide*.