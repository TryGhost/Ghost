**To list the updates for a cluster**

This example command lists the current updates for a cluster named ``example`` in your default region.

Command::

  aws eks list-updates --name example

Output::

  {
      "updateIds": [
          "10bddb13-a71b-425a-b0a6-71cd03e59161"
      ]
  }
