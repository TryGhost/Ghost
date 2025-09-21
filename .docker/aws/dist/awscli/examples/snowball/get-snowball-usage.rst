**To get information about the Snowball service limit for your account**

The following ``get-snowball-usage`` example displays information about the Snowball service limit for your account, and also the number of Snowballs your account has in use. ::

    aws snowball get-snowball-usage

Output::

    {
        "SnowballLimit": 1,
        "SnowballsInUse": 0
    }

FOR more information, see `AWS Snowball Edge Limits <https://docs.aws.amazon.com/snowball/latest/developer-guide/limits.html>`__ in the *AWS Snowball Developer Guide*.
