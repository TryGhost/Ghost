The following command removes a tag with the key ``date`` from a vault named ``my-vault``::

  aws glacier remove-tags-from-vault --account-id - --vault-name my-vault --tag-keys date

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.
