Get a configuration value from the config file.

The ``aws configure get`` command can be used to print a configuration value in
the AWS config file.  The ``get`` command supports two types of configuration
values, *unqualified* and *qualified* config values.


Note that ``aws configure get`` only looks at values in the AWS configuration
file.  It does **not** resolve configuration variables specified anywhere else,
including environment variables, command line arguments, etc.


Unqualified Names
-----------------

Every value in the AWS configuration file must be placed in a section (denoted
by ``[section-name]`` in the config file).  To retrieve a value from the
config file, the section name and the config name must be known.

An unqualified configuration name refers to a name that is not scoped to a
specific section in the configuration file.  Sections are specified by
separating parts with the ``"."`` character (``section.config-name``).  An
unqualified name will be scoped to the current profile.  For example,
``aws configure get aws_access_key_id`` will retrieve the ``aws_access_key_id``
from the current profile,  or the ``default`` profile if no profile is
specified.  You can still provide a ``--profile`` argument to the ``aws
configure get`` command.  For example, ``aws configure get region --profile
testing`` will print the region value for the ``testing`` profile.


Qualified Names
---------------

A qualified name is a name that has at least one ``"."`` character in the name.
This name provides a way to specify the config section from which to retrieve
the config variable.  When a qualified name is provided to ``aws configure
get``, the currently specified profile is ignored.  Section names that have
the format ``[profile profile-name]`` can be specified by using the
``profile.profile-name.config-name`` syntax, and the default profile can be
specified using the ``default.config-name`` syntax.
