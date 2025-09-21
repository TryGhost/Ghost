Suppose you had the following config file::

    [default]
    aws_access_key_id=default_access_key
    aws_secret_access_key=default_secret_key

    [profile testing]
    aws_access_key_id=testing_access_key
    aws_secret_access_key=testing_secret_key
    region=us-west-2

The following commands would have the corresponding output::

    $ aws configure get aws_access_key_id
    default_access_key

    $ aws configure get default.aws_access_key_id
    default_access_key

    $ aws configure get aws_access_key_id --profile testing
    testing_access_key

    $ aws configure get profile.testing.aws_access_key_id
    testing_access_key

    $ aws configure get profile.does-not-exist
    $
    $ echo $?
    1
