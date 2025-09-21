**To list the bundles provided by Amazon**

The following ``describe-workspace-bundles`` example lists the names and IDs of the bundles provided by Amazon, in table format and sorted by name. ::

    aws workspaces describe-workspace-bundles \
        --owner AMAZON \
        --query "Bundles[*].[Name, BundleId]" 

Output::

    [
        [
            "Standard with Amazon Linux 2",
            "wsb-clj85qzj1"
        ],
        [
            "Performance with Windows 10 (Server 2016 based)",
            "wsb-gm4d5tx2v"
        ],
        [
            "PowerPro with Windows 7",
            "wsb-1pzkp0bx4"
        ],
        [
            "Power with Amazon Linux 2",
            "wsb-2bs6k5lgn"
        ],
        [
            "Graphics with Windows 10 (Server 2019 based)",
            "wsb-03gyjnfyy"
        ],
        ...
    ]

For more information, see `WorkSpaces bundles and images <https://docs.aws.amazon.com/workspaces/latest/adminguide/amazon-workspaces-bundles.html>`__ in the *Amazon WorkSpaces Administration Guide*.
