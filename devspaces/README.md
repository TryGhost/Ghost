# Ghost Development with DevSpaces 

## DF DevSpaces CLI Installation

You can download the setup file in [this link](https://www.devspaces.io/devspaces/download) and follow the install steps [here](https://support.devspaces.io/article/22-devspaces-client-installation).

* To download the DevSpaces CLI, you need to log in using your GitHub account.

## DF DevSpaces CLI Usage

After installation, you can use DevSpaces CLI by running `devspaces` command in the command line. It will show all the actions that you can do with DevSpaces.

### Start a new DevSpace for Ghost

Please, follow these steps to create a new DevSpace and build the Ghost project inside it:

1. Move to `devspaces` folder. This folder contains all resources that are needed to create the DevSpace.

        cd devspaces

1. Create the DevSpace by running the following command. A new window will be shown with the build status.

        devspaces create
    
    * The notification system will show a message when the build is finished. Then the validation process starts (it takes at least 2 minutes).

1. When the validation process is finished, you can start the DevSpace by running the following command. 

        devspaces start ghost

    * The notification system will inform when the start is finished.

1. You can enter the created DevSpace by running the following command. 

        devspaces exec ghost

### Build, Test and get Ghost running

1. First, you need the source code inside the container. There are two approaches to get that: clone the repository inside the container (a) or bind the local repository with the container (b). 

    a. To clone the repository inside the container you can run the following command:

                git clone --recursive https://github.com/trilogy-group/Ghost.git

    * If you want to clone the repository inside the `/data` folder you will need to first clean it (**CAUTION: if it is bonded, the files in local environment will be deleted too**):

                cd /data
                rm -rf .* *
                git clone --recursive https://github.com/trilogy-group/Ghost.git .

    b. To bind a folder to the created and started DevSpace, it is needed to follow the steps below:

    * Make sure that the DevSpace is `Running` using the `devspaces ls` command.
    * With a running DevSpace, move to the root folder of the repository in the local machine.
    * Run the below command to bind the current folder:

                devspaces bind ghost

    * Wait to get all files synced. When you get the sync up to date, everything that is changed, deleted or created inside the local folder or in the `/data` folder inside the container will be synced. The sync is bidirectional. 
    * **Note:** If you want to stop the bind, just move to the bonded folder and run the command:

                devspaces unbind ghost

1. The Ghost web UI has some links configured with absolute paths URLs. So, it is needed to config the host and port for the exposed server to get it working. To do that, we need to run the `env_config` but, first, we need to discover what is the host and port by running the info command:

        devspaces info jive-mitui-cloud

1. The above command will show information about the given devspace. You need to copy the URL for the port `2368`  and run the `env_config` script passing that URL, for instance:

        /opt/env_config.sh ghost.otaviocx.devspaces.io:15435
        
1. The command above will configure a new env properties file and put it inside the project. Now, we need to setup the new environment. It will install the dependencies, initialise the database and run a first build:

        yarn setup

1. With the project built, you can now run the tests:

        grunt test-all

1. And, finally, we can start it by running the following command:

        grunt dev

1. To access the running Ghost server, you can go to the same link that you got running the info command. Just open it in a web browser.
