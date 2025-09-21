**To enable Amazon Detective and create a new behavior graph**

The following ``create-graph`` example enables Detective for the AWS account that runs the command in the Region where the command is run. A new behavior graph is created that has that account as its administrator account. The command also assigns the value Finance to the Department tag. ::

    aws detective create-graph \
        --tags '{"Department": "Finance"}'

Output::

    {
        "GraphArn": "arn:aws:detective:us-east-1:111122223333:graph:027c7c4610ea4aacaf0b883093cab899"
    }

For more information, see `Enabling Amazon Detective <https://docs.aws.amazon.com/detective/latest/adminguide/detective-enabling.html>`__ in the *Amazon Detective Administration Guide*.