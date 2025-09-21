    **Note:** This command is deprecated. Use ``get-login-password`` instead.

**To log in to an Amazon ECR registry**

This command retrieves an authentication token using the GetAuthorizationToken API, and then it prints a ``docker login`` command with the authorization token and, if you specified a registry ID, the URI for an Amazon ECR registry. You can execute the printed command to authenticate to the registry with Docker. After you have authenticated to an Amazon ECR registry with this command, you can use the Docker CLI to push and pull images to and from that registry as long as your IAM principal has access to do so until the token expires.  The authorization token is valid for 12 hours.

.. note::

    This command displays ``docker login`` commands to stdout with
    authentication credentials. Your credentials could be visible by other
    users on your system in a process list display or a command history. If you
    are not on a secure system, you should consider this risk and login
    interactively. For more information, see ``get-authorization-token``.