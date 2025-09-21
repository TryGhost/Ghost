The following command adds two tags to a vault named ``my-vault``::

  aws glacier add-tags-to-vault --account-id - --vault-name my-vault --tags id=1234,date=july2015

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.
