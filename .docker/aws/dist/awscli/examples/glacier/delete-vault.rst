The following command deletes a vault named ``my-vault``::

  aws glacier delete-vault --vault-name my-vault --account-id -

This command does not produce any output. Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.