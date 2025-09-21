**To delete a webhook**

The following ``delete-webhook`` example deletes a webhook for a GitHub version 1 source action. You must use the ``deregister-webhook-with-third-party`` command to deregister the webhook before you delete it. ::

    aws codepipeline delete-webhook \
        --name my-webhook

This command produces no output.

For more information, see `Delete the webhook for your GitHub source <https://docs.aws.amazon.com/codepipeline/latest/userguide/appendix-github-oauth.html#pipelines-webhooks-delete>`__ in the *AWS CodePipeline User Guide*.