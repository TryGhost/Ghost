The following command configures a data retrieval policy for the in-use account::

  aws glacier set-data-retrieval-policy --account-id - --policy file://data-retrieval-policy.json

``data-retrieval-policy.json`` is a JSON file in the current folder that specifies a data retrieval policy::

  {
    "Rules":[
       {
           "Strategy":"BytesPerHour",
           "BytesPerHour":10737418240
        }
     ]
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.

The following command sets the data retrieval policy to ``FreeTier`` using inline JSON::

  aws glacier set-data-retrieval-policy --account-id - --policy '{"Rules":[{"Strategy":"FreeTier"}]}'

See `Set Data Retrieval Policy`_ in the *Amazon Glacier API Reference* for details on the policy format.

.. _`Set Data Retrieval Policy`: http://docs.aws.amazon.com/amazonglacier/latest/dev/api-SetDataRetrievalPolicy.html
