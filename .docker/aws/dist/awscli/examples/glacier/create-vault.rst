The following command creates a new vault named ``my-vault``::

  aws glacier create-vault --vault-name my-vault --account-id -

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.