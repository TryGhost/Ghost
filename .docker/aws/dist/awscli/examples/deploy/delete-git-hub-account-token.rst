**To deletes a GitHub account connection**

The following ``delete-git-hub-account-token`` example deletes the connection of the specified GitHub account. ::

    aws deploy delete-git-hub-account-token --token-name my-github-account
    
Output::

    {
        "tokenName": "my-github-account"
    }

For more information, see `DeleteGitHubAccountToken <https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_DeleteGitHubAccountToken.html>`_ in the *AWS CodeDeploy API Reference*.
