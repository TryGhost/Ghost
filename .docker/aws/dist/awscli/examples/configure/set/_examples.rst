Given an empty config file, the following commands::

    $ aws configure set aws_access_key_id default_access_key
    $ aws configure set aws_secret_access_key default_secret_key
    $ aws configure set default.region us-west-2
    $ aws configure set default.ca_bundle /path/to/ca-bundle.pem
    $ aws configure set region us-west-1 --profile testing
    $ aws configure set profile.testing2.region eu-west-1

will produce the following config file::

    [default]
    region = us-west-2
    ca_bundle = /path/to/ca-bundle.pem

    [profile testing]
    region = us-west-1

    [profile testing2]
    region = eu-west-1

and the following ``~/.aws/credentials`` file::

    [default]
    aws_access_key_id = default_access_key
    aws_secret_access_key = default_secret_key

To perform bulk profiles update ``list-profiles`` command can be piped with ``set`` command.
For update region for all profiles, the following command can be used::

    aws configure list-profiles | xargs -I {} aws configure set region us-west-2 --profile {}

will produce the following updated config file::

    [default]
    region = us-west-2
    ca_bundle = /path/to/ca-bundle.pem

    [profile testing]
    region = us-west-2

    [profile testing2]
    region = us-west-2

For update profiles by pattern "testing*", the following command can be used::

    aws configure list-profiles | grep 'testing*' | xargs -I {} aws configure set cli_pager '' --profile {}

will produce the following updated config file::

    [default]
    region = us-west-2
    ca_bundle = /path/to/ca-bundle.pem

    [profile testing]
    region = us-west-2
    cli_pager =

    [profile testing2]
    region = us-west-2
    cli_pager =
