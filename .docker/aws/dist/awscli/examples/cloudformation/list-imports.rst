**To list imports**

The following ``list-imports`` example lists the stacks that import the specified export. To get the list of available exports, use the ``list-exports`` command. ::

    aws cloudformation list-imports \
        --export-name private-vpc-vpcid

Output::

    {
        "Imports": [
            "my-database-stack"
        ]
    }
