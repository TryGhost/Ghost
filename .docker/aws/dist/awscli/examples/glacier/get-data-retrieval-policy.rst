The following command gets the data retrieval policy for the in-use account::

  aws glacier get-data-retrieval-policy --account-id -

Output::

  {
      "Policy": {
          "Rules": [
              {
                  "BytesPerHour": 10737418240,
                  "Strategy": "BytesPerHour"
              }
          ]
      }
  }

Amazon Glacier requires an account ID argument when performing operations, but you can use a hyphen to specify the in-use account.
