:title: AWS DDB Expressions
:description: Details on the expression syntax for the ddb commands
:category: ddb
:related command: ddb select, ddb put

The ``ddb`` commands provide a simplified expression-writing experince by
adding some additional syntax which allows for specifying attribute names and
attribute values without having to define placeholders.

For example, one might write the following command using the base ``dynamodb``
commands::

    aws dynamodb scan \
        --table-name ProductCatalog \
        --condition-expression "Price between :lo and :hi" \
        --expression-attribute-values file://values.json

With the contents of ``values.json`` being::

    {
        ":lo": {"N": "500"},
        ":hi": {"N": "600"}
    }

With ``ddb select`` you would write::

    aws ddb select ProductCatalog --condition 'Price between 500 and 600'

Then the CLI would handle extracting the the numbers to make the final request.
The CLI can handle extracting any values in this way.

Attribute Name Syntax
---------------------

Attribute names may be specified as unquoted strings, or as strings quoted
using single quotes. Using single quotes will be necessary if an attribute name
starts with a digit or contains any characters outsize of ascii letters and
digits. For example, the following would be valid attribute names: ``foo``,
``'foo bar'``, ``'foo.bar'`` etc.

Attribute Paths
===============

When specifying an attribute path, each attribute name in the path may be
individually quoted. For example: ``foo.'bar baz'[0]``.

Reserved Words
==============

The following words are reserved in the CLI, and so they MUST be quoted if you
intend to use them as an attribute name. Each word is case-insensitive.

* ``AND``
* ``BETWEEN``
* ``IN``
* ``OR``
* ``NOT``
* ``SET``
* ``REMOVE``
* ``ADD``
* ``DELETE``
* ``TRUE``
* ``FALSE``
* ``NULL``

Attribute Value Syntax
----------------------

Numbers
=======

Numbers may be specified as you would specify them in JSON. For example, each
of the following would be valid numbers: ``1``, ``1.1``, ``1.1e3``,
``-1.1e-3``, etc.

Strings
=======

Strings may be specified as you would specify them in JSON. This means that
they must be enclosed by double quotes, and any internal double quote
characters must be escaped with a backslash. For example, each of the following
would be a valid string: ``"foo"``, ``"\"hello\" world"``, etc. Note that you
may need to escape the backslash itself depending on your shell.

Bytes
=====

Binary values are base64-encoded values prefixed by ``b"`` and suffixed by
``"``. For example, the follwoing would be a valid binary value: ``b"4pyT"``.

Booleans
========

Boolean values may be specified as ``true`` or ``false``.

Null
====

Null values are specified simply as ``null``

Lists
=====

Lists may be specified as you would specify them in JSON, with the exception
that binary values and set values are valid elements. This means that the list
must start with ``[`` and end with ``]``. Each element in the list must be
separated by a comma. For example: ``["foo", b"4pyT", 8]``.

Sets
====

Sets must begin with ``{`` and end with ``}``. Each item in the set must be
separated by a comma. Sets may only contain numbers, strings, and bytes. All
values in the set must be of the same type. Sets must contain at least one
value. For example, each of the following is a valid set: ``{1, 2, 3}``,
``{"foo", "bar"}``, ``{b"4pyT"}``.

Maps
====

Maps may be specified as you would specify them in JSON, with the exception
that bytes and sets are valid values. This means that the map must start with
``{`` and end with ``}``. It may contain any number of key-value pairs where
the key and value are separated by a colon (``:``). Keys must be strings, but
values may be any type. For example: ``{"foo": {"bar": {b"4pyT"}}}``.
