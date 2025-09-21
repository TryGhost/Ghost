The following command lists the tags applied to a vault named ``my-vault``::

  aws glacier list-tags-for-vault --account-id - --vault-name my-vault

Output::

  {
      "Tags": {
          "date": "july2015",
          "id": "1234"
      }
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.
