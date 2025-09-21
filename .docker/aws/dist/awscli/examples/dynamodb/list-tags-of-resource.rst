**Example 1: To list tags of a DynamoDB resource**

The following ``list-tags-of-resource`` example displays tags for the ``MusicCollection`` table. ::

    aws dynamodb list-tags-of-resource \
        --resource-arn arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection

Output::

    {
        "Tags": [
            {
                "Key": "Owner",
                "Value": "blueTeam"
            },
            {
                "Key": "Environment",
                "Value": "Production"
            }
        ]
    }

For more information, see `Tagging for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 2: To limit the number of tags returned**

The following example limits the number of tags returned to 1. The response includes a ``NextToken`` value with which to retrieve the next page of results. ::

    aws dynamodb list-tags-of-resource \
        --resource-arn arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection \
        --max-items 1

Output::

    {
        "Tags": [
            {
                "Key": "Owner",
                "Value": "blueTeam"
            }
        ],
        "NextToken": "abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9"
    }

For more information, see `Tagging for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html>`__ in the *Amazon DynamoDB Developer Guide*.

**Example 3: To retrieve the next page of results**

The following command uses the ``NextToken`` value from a previous call to the ``list-tags-of-resource`` command to retrieve another page of results. Since the response in this case does not include a ``NextToken`` value, we know that we have reached the end of the results. ::

    aws dynamodb list-tags-of-resource \
        --resource-arn arn:aws:dynamodb:us-west-2:123456789012:table/MusicCollection \
        --starting-token abCDeFGhiJKlmnOPqrSTuvwxYZ1aBCdEFghijK7LM51nOpqRSTuv3WxY3ZabC5dEFGhI2Jk3LmnoPQ6RST9

Output::

    {
        "Tags": [
            {
                "Key": "Environment",
                "Value": "Production"
            }
        ]
    }

For more information, see `Tagging for DynamoDB <https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html>`__ in the *Amazon DynamoDB Developer Guide*.