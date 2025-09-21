The following command shows all of the in-progress multipart uploads for a vault named ``my-vault``::

  aws glacier list-multipart-uploads --account-id - --vault-name my-vault

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account. 

For more information on multipart uploads to Amazon Glacier using the AWS CLI, see `Using Amazon Glacier`_ in the *AWS CLI User Guide*.

.. _`Using Amazon Glacier`: http://docs.aws.amazon.com/cli/latest/userguide/cli-using-glacier.html