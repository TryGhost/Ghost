:title: AWS CLI Configuration Variables
:description: Configuration Variables for the AWS CLI
:category: General
:related command: configure, configure get, configure set
:related topic: s3-config

Configuration values for the AWS CLI can come from several sources:

* As a command line option
* As an environment variable
* As a value in the AWS CLI config file
* As a value in the AWS Shared Credential file

Some options are only available in the AWS CLI config.  This topic guide covers
all the configuration variables available in the AWS CLI.

Note that if you are just looking to get the minimum required configuration to
run the AWS CLI, we recommend running ``aws configure``, which will prompt you
for the necessary configuration values.

Config File Format
==================

The AWS CLI config file, which defaults to ``~/.aws/config`` has the following
format::

    [default]
    aws_access_key_id=foo
    aws_secret_access_key=bar
    region=us-west-2

The ``default`` section refers to the configuration values for the default
profile.  You can create profiles, which represent logical groups of
configuration.  Profiles that aren't the default profile are specified by
creating a section titled "profile profilename"::

    [profile testing]
    aws_access_key_id=foo
    aws_secret_access_key=bar
    region=us-west-2

Nested Values
-------------

Some service specific configuration, discussed in more detail below, has a
single top level key, with nested sub values.  These sub values are denoted by
indentation::

    [profile testing]
    aws_access_key_id = foo
    aws_secret_access_key = bar
    region = us-west-2
    s3 =
      max_concurrent_requests=10
      max_queue_size=1000


General Options
===============

The AWS CLI has a few general options:

==================== ============== ===================== ===================== ================================
Variable             Option         Config Entry          Environment Variable  Description
==================== ============== ===================== ===================== ================================
profile              --profile      N/A                   AWS_PROFILE           Default profile name
-------------------- -------------- --------------------- --------------------- --------------------------------
region               --region       region                AWS_DEFAULT_REGION    Default AWS Region
-------------------- -------------- --------------------- --------------------- --------------------------------
output               --output       output                AWS_DEFAULT_OUTPUT    Default output style
-------------------- -------------- --------------------- --------------------- --------------------------------
cli_timestamp_format N/A            cli_timestamp_format  N/A                   Output format of timestamps
-------------------- -------------- --------------------- --------------------- --------------------------------
ca_bundle            --ca-bundle    ca_bundle             AWS_CA_BUNDLE         CA Certificate Bundle
-------------------- -------------- --------------------- --------------------- --------------------------------
parameter_validation N/A            parameter_validation  N/A                   Toggles parameter validation
-------------------- -------------- --------------------- --------------------- --------------------------------
tcp_keepalive        N/A            tcp_keepalive         N/A                   Toggles TCP Keep-Alive
-------------------- -------------- --------------------- --------------------- --------------------------------
max_attempts         N/A            max_attempts          AWS_MAX_ATTEMPTS      Number of total requests
-------------------- -------------- --------------------- --------------------- --------------------------------
retry_mode           N/A            retry_mode            AWS_RETRY_MODE        Type of retries performed
-------------------- -------------- --------------------- --------------------- --------------------------------
cli_pager            --no-cli-pager cli_pager             AWS_PAGER             Redirect/Disable output to pager
==================== ============== ===================== ===================== ================================

The third column, Config Entry, is the value you would specify in the AWS CLI
config file.  By default, this location is ``~/.aws/config``.  If you need to
change this value, you can set the ``AWS_CONFIG_FILE`` environment variable
to change this location.

The valid values of the ``output`` configuration variable are:

* json
* table
* text

``cli_timestamp_format`` controls the format of timestamps displayed by the AWS CLI.
The valid values of the ``cli_timestamp_format`` configuration variable are:

* wire - Display the timestamp exactly as received from the HTTP response.
* iso8601 - Reformat timestamp using iso8601 in the UTC timezone.

``cli_binary_format`` controls the format of binary values in input and output.
The valid values of the ``cli_binary_format`` configuration variable are:

* base64 - Binary values are provided as Base64 encoded strings. The default.
* raw-in-base64-out - Binary values are provided are treated literally.
  Consistent with AWS CLI V1.

When providing contents from a file that map to a binary blob ``fileb://`` will
always be treated as binary and use the file contents directly regardless of
the ``cli_binary_format`` setting. When using ``file://`` the file contents
will need to properly formatted for the configured ``cli_binary_format``.

The default value is ``iso8601``.

``parameter_validation`` controls whether parameter validation should occur
when serializing requests. The default is True. You can disable parameter
validation for performance reasons. Otherwise, it's recommended to leave
parameter validation enabled.

The ``max_attempts`` and ``retry_mode`` are explained in the
"Retry Configuration" section below.

When you specify a profile, either using ``--profile profile-name`` or by
setting a value for the ``AWS_PROFILE`` environment variable, profile
name you provide is used to find the corresponding section in the AWS CLI
config file.  For example, specifying ``--profile development`` will instruct
the AWS CLI to look for a section in the AWS CLI config file of
``[profile development]``.

Precedence
----------

The above configuration values have the following precedence:

* Command line options
* Environment variables
* Configuration file


Credentials
===========

Credentials can be specified in several ways:

* Environment variables
* The AWS Shared Credential File
* The AWS CLI config file

============================= ============================= ================================= ==============================
Variable                      Creds/Config Entry            Environment Variable              Description
============================= ============================= ================================= ==============================
access_key                    aws_access_key_id             AWS_ACCESS_KEY_ID                 AWS Access Key
----------------------------- ----------------------------- --------------------------------- ------------------------------
secret_key                    aws_secret_access_key         AWS_SECRET_ACCESS_KEY             AWS Secret Key
----------------------------- ----------------------------- --------------------------------- ------------------------------
token                         aws_session_token             AWS_SESSION_TOKEN                 AWS Token (temp credentials)
----------------------------- ----------------------------- --------------------------------- ------------------------------
metadata_service_timeout      metadata_service_timeout      AWS_METADATA_SERVICE_TIMEOUT      EC2 metadata creds timeout
----------------------------- ----------------------------- --------------------------------- ------------------------------
metadata_service_num_attempts metadata_service_num_attempts AWS_METADATA_SERVICE_NUM_ATTEMPTS EC2 metadata creds retry count
============================= ============================= ================================= ==============================

The second column specifies the name that you can specify in either the AWS CLI
config file or the AWS Shared credentials file (``~/.aws/credentials``).


The Shared Credentials File
---------------------------

The shared credentials file has a default location of
``~/.aws/credentials``.  You can change the location of the shared
credentials file by setting the ``AWS_SHARED_CREDENTIALS_FILE``
environment variable.

This file is an INI formatted file with section names
corresponding to profiles.  With each section, the three configuration
variables shown above can be specified: ``aws_access_key_id``,
``aws_secret_access_key``, ``aws_session_token``.  **These are the only
supported values in the shared credential file.**  Also note that the
section names are different than the AWS CLI config file (``~/.aws/config``).
In the AWS CLI config file, you create a new profile by creating a section of
``[profile profile-name]``, for example::

    [profile development]
    aws_access_key_id=foo
    aws_secret_access_key=bar

In the shared credentials file, profiles are not prefixed with ``profile``,
for example::

    [development]
    aws_access_key_id=foo
    aws_secret_access_key=bar


Precedence
----------

Credentials from environment variables have precedence over credentials from
the shared credentials and AWS CLI config file.  Credentials specified in the
shared credentials file have precedence over credentials in the AWS CLI config
file. If ``AWS_PROFILE`` environment variable is set and the
``AWS_ACCESS_KEY_ID`` and ``AWS_SECRET_ACCESS_KEY`` environment variables are
set, then the credentials provided by  ``AWS_ACCESS_KEY_ID`` and
``AWS_SECRET_ACCESS_KEY`` will override the credentials located in the
profile provided by ``AWS_PROFILE``.


Using AWS IAM Roles
-------------------

If you are on an Amazon EC2 instance that was launched with an IAM role, the
AWS CLI will automatically retrieve credentials for you.  You do not need
to configure any credentials.

Additionally, you can specify a role for the AWS CLI to assume, and the AWS
CLI will automatically make the corresponding ``AssumeRole`` calls for you.
Note that configuration variables for using IAM roles can only be in the AWS
CLI config file.

You can specify the following configuration values for configuring an IAM role
in the AWS CLI config file:

* ``role_arn`` - The ARN of the role you want to assume.
* ``source_profile`` - The AWS CLI profile that contains credentials /
  configuration the CLI should use for the initial ``assume-role`` call. This
  profile may be another profile configured to use ``assume-role``, though
  if static credentials are present in the profile they will take precedence.
  This parameter cannot be provided alongside ``credential_source``.
* ``credential_source`` - The credential provider to use to get credentials for
  the initial ``assume-role`` call. This parameter cannot be provided
  alongside ``source_profile``. Valid values are:

  * ``Environment`` to pull source credentials from environment variables. Note
    this credential source does not work alongside the ``AWS_PROFILE``
    environment variable.
  * ``Ec2InstanceMetadata`` to use the EC2 instance role as source credentials.
  * ``EcsContainer`` to use the ECS container credentials as the source
    credentials.

* ``external_id`` - A unique identifier that is used by third parties to assume
  a role in their customers' accounts.  This maps to the ``ExternalId``
  parameter in the ``AssumeRole`` operation.  This is an optional parameter.
* ``mfa_serial`` - The identification number of the MFA device to use when
  assuming a role.  This is an optional parameter.  Specify this value if the
  trust policy of the role being assumed includes a condition that requires MFA
  authentication. The value is either the serial number for a hardware device
  (such as GAHT12345678) or an Amazon Resource Name (ARN) for a virtual device
  (such as arn:aws:iam::123456789012:mfa/user).
* ``role_session_name`` - The name applied to this assume-role session. This
  value affects the assumed role user ARN  (such as
  arn:aws:sts::123456789012:assumed-role/role_name/role_session_name). This
  maps to the ``RoleSessionName`` parameter in the ``AssumeRole`` operation.
  This is an optional parameter.  If you do not provide this value, a
  session name will be automatically generated.
* ``duration_seconds`` - The  duration,  in seconds, of the role session.
  The value can range from 900 seconds (15 minutes) up to  the  maximum 
  session  duration setting  for  the role.  This is an optional parameter
  and by default, the value is set to 3600 seconds.

If you do not have MFA authentication required, then you only need to specify a
``role_arn`` and either a ``source_profile`` or a ``credential_source``.

When you specify a profile that has IAM role configuration, the AWS CLI
will make an ``AssumeRole`` call to retrieve temporary credentials.  These
credentials are then stored (in ``~/.aws/cli/cache``).  Subsequent AWS CLI
commands will use the cached temporary credentials until they expire, in which
case the AWS CLI will automatically refresh credentials.

If you specify an ``mfa_serial``, then the first time an ``AssumeRole`` call is
made, you will be prompted to enter the MFA code.  Subsequent commands will use
the cached temporary credentials.  However, when the temporary credentials
expire, you will be re-prompted for another MFA code.


Example configuration using ``source_profile``::

  # In ~/.aws/credentials:
  [development]
  aws_access_key_id=foo
  aws_secret_access_key=bar

  # In ~/.aws/config
  [profile crossaccount]
  role_arn=arn:aws:iam:...
  source_profile=development

Example configuration using ``credential_source`` to use the instance role as
the source credentials for the assume role call::

  # In ~/.aws/config
  [profile crossaccount]
  role_arn=arn:aws:iam:...
  credential_source=Ec2InstanceMetadata

Assume Role With Web Identity
--------------------------------------

Within the ``~/.aws/config`` file, you can also configure a profile to indicate
that the AWS CLI should assume a role.  When you do this, the AWS CLI will
automatically make the corresponding ``AssumeRoleWithWebIdentity`` calls to AWS
STS on your behalf.

When you specify a profile that has IAM role configuration, the AWS CLI will
make an ``AssumeRoleWithWebIdentity`` call to retrieve temporary credentials.
These credentials are then stored (in ``~/.aws/cli/cache``).  Subsequent AWS
CLI commands will use the cached temporary credentials until they expire, in
which case the AWS CLI will automatically refresh credentials.

You can specify the following configuration values for configuring an
assume role with web identity profile in the shared config:


* ``role_arn`` - The ARN of the role you want to assume.
* ``web_identity_token_file`` - The path to a file which contains an OAuth 2.0
  access token or OpenID Connect ID token that is provided by the identity
  provider. The contents of this file will be loaded and passed as the
  ``WebIdentityToken`` argument to the ``AssumeRoleWithWebIdentity`` operation.
* ``role_session_name`` - The name applied to this assume-role session. This
  value affects the assumed role user ARN  (such as
  arn:aws:sts::123456789012:assumed-role/role_name/role_session_name). This
  maps to the ``RoleSessionName`` parameter in the
  ``AssumeRoleWithWebIdentity`` operation.  This is an optional parameter. If
  you do not provide this value, a session name will be automatically
  generated.

Below is an example configuration for the minimal amount of configuration
needed to configure an assume role with web identity profile::

  # In ~/.aws/config
  [profile web-identity]
  role_arn=arn:aws:iam:...
  web_identity_token_file=/path/to/a/token

This provider can also be configured via the environment:

``AWS_ROLE_ARN``
    The ARN of the role you want to assume.

``AWS_WEB_IDENTITY_TOKEN_FILE``
    The path to the web identity token file.

``AWS_ROLE_SESSION_NAME``
    The name applied to this assume-role session.

.. note::

    These environment variables currently only apply to the assume role with
    web identity provider and do not apply to the general assume role provider
    configuration.


Sourcing Credentials From External Processes
--------------------------------------------

.. warning::

    The following describes a method of sourcing credentials from an external
    process. This can potentially be dangerous, so proceed with caution. Other
    credential providers should be preferred if at all possible. If using
    this option, you should make sure that the config file is as locked down
    as possible using security best practices for your operating system.
    Ensure that your custom credential tool does not write any secret 
    information to StdErr because the SDKs and CLI can capture and log such 
    information, potentially exposing it to unauthorized users.

If you have a method of sourcing credentials that isn't built in to the AWS
CLI, you can integrate it by using ``credential_process`` in the config file.
The AWS CLI will call that command exactly as given and then read json data
from stdout. The process must write credentials to stdout in the following
format::

    {
      "Version": 1,
      "AccessKeyId": "",
      "SecretAccessKey": "",
      "SessionToken": "",
      "Expiration": ""
    }

The ``Version`` key must be set to ``1``. This value may be bumped over time
as the payload structure evolves.

The ``Expiration`` key is an ISO8601 formatted timestamp. If the ``Expiration``
key is not returned in stdout, the credentials are long term credentials that
do not refresh. Otherwise the credentials are considered refreshable
credentials and will be refreshed automatically. NOTE: Unlike with assume role
credentials, the AWS CLI will NOT cache process credentials. If caching is
needed, it must be implemented in the external process.

The process can return a non-zero RC to indicate that an error occurred while
retrieving credentials.

Some process providers may need additional information in order to retrieve the
appropriate credentials. This can be done via command line arguments. NOTE:
command line options may be visible to process running on the same machine.

Example configuration::

    [profile dev]
    credential_process = /opt/bin/awscreds-custom

Example configuration with parameters::

    [profile dev]
    credential_process = /opt/bin/awscreds-custom --username monty


Service Specific Configuration
==============================

Retry Configuration
-------------------

These configuration variables control how the AWS CLI retries requests.

``max_attempts``
    An integer representing the maximum number attempts that will be made for
    a single request, including the initial attempt.  For example,
    setting this value to 5 will result in a request being retried up to
    4 times.  If not provided, the number of retries will default to whatever
    is modeled, which is 3 in the ``standard`` and ``adaptive`` retry modes.

``retry_mode``
    A string representing the type of retries the AWS CLI will perform.  Value
    values are:

        * ``standard`` - A standardized set of retry rules across the AWS SDKs.
          This includes a standard set of errors that are retried as well as
          support for retry quotas, which limit the number of unsuccessful retries
          an SDK can make.  This mode will default the maximum number of attempts
          to 3 unless a ``max_attempts`` is explicitly provided.
        * ``adaptive`` - An experimental retry mode that includes all the
          functionality of ``standard`` mode along with automatic client side
          throttling.  This is a provisional mode that may change behavior in
          the future.


Amazon S3
---------

There are a number of configuration variables specific to the S3 commands. See
:doc:`s3-config` (``aws help topics s3-config``) for more details.


OS Specific Configuration
=========================

Locale
------

If you have data stored in AWS that uses a particular encoding, you should make
sure that your systems are configured to accept that encoding. For instance, if
you have unicode characters as part of a key on EC2 you will need to make sure
that your locale is set to a unicode-compatible locale. How you configure your
locale will depend on your operating system and your specific IT requirements.
One option for UNIX systems is the ``LC_ALL`` environment variable. Setting
``LC_ALL=en_US.UTF-8``, for instance, would give you a United States English
locale which is compatible with unicode.

To set the encoding that is used when reading from text files, you can use the
``AWS_CLI_FILE_ENCODING`` environment variable. For example, if you use Windows
with default encoding ``CP1252``, setting ``AWS_CLI_FILE_ENCODING=UTF-8`` would
make CLI ignore locale encoding and open text files using ``UTF-8``.

To set the encoding used for the CLI's output, you can use the
``AWS_CLI_OUTPUT_ENCODING`` environment variable. For example, if you use Windows
with the default encoding ``CP1252``, setting ``AWS_CLI_OUTPUT_ENCODING=UTF-8``
would make CLI ignore the locale encoding and format its output using ``UTF-8``.

Refer to
`Python's Standard Encodings documentation <https://docs.python.org/3/library/codecs.html#standard-encodings>`_
for possible values for both settings.

Pager
-----

The AWS CLI uses a pager for output data that does not fit on the screen.

On Linux/MacOS, ``less`` is used as the default pager. On Windows,
the default is ``more``.

Configuring pager
^^^^^^^^^^^^^^^^^^

You can override the default pager with the following configuration
options. These are in order of precedence:

* ``AWS_PAGER`` environment variable

* ``cli_pager`` shared config variable

* ``PAGER`` environment variable

If you set any of the configuration options to an empty string
(e.g. ``AWS_PAGER=""``) or use ``--no-cli-pager`` option in the command line the
AWS CLI will not send the output to a pager.

Examples
""""""""

To disable the pager for ``default`` profile::

    aws configure set cli_pager "" --profile default

To disable the pager for all profiles in the current terminal session::

    export AWS_PAGER="" - for Linux

    set AWS_PAGER="" - for Windows cmd

To disable the pager for one command call::

    aws <command> <sub-command> --no-cli-pager


Pager settings
^^^^^^^^^^^^^^

If the ``LESS`` environment variable is not set the AWS CLI will set it to ``FRX``
(see "less" manual page for more information about possible options
https://man7.org/linux/man-pages/man1/less.1.html)
in order to set the appropriate flags. If you set the ``LESS`` env var, we will
not clobber it with ours (e.g. ``FRX``). Be aware that different shells can
have different default values for the ``LESS`` environment variable that can cause
unexpected behavior of AWS CLI output

You can also set flags when specifying the pager and those will combine
with any environment variables we set (e.g. ``AWS_PAGER="less -S"`` will make it
less ``-FRXS``). The behavior of combining flags is a feature of ``less``.
You can also negate flags we set by specifying it on the command line:
(e.g. ``AWS_PAGER="less -+F"`` will deactivate the quit if one screen behavior)

For Windows, ``more`` is used with no additional environment variables.

Plugins
=======

.. warning::
   Plugin support in the AWS CLI v2 is completely provisional and intended to
   help users migrate from AWS CLI v1 until a stable plugin interface is
   released. There are no guarantees that a particular plugin or even the
   CLI plugin interface will be supported in future versions of the AWS CLI v2.
   If you are relying on plugins, be sure to lock to a particular version of
   the CLI and test functionality of your plugin when you do upgrade.

To enable plugin support, create ``[plugins]`` section in your
``~/.aws/config`` file::

     [plugins]
     cli_legacy_plugin_path = <path-to-plugins>/python3.8/site-packages
     <plugin-name> = <plugin-module>


In the ``[plugins]`` section, you must define the ``cli_legacy_plugin_path``
variable and set its value to the Python site packages path that your plugin
lives in. Once defined, you can configure plugins by providing a name for the
plugin, ``plugin-name``, and the Python module, ``plugin-module``, that
contains the source code for your plugin. Then, the CLI loads each plugin
by importing their ``plugin-module`` and calling their ``awscli_initialize``
function.
