#!/bin/sh
# Copyright 2012-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

usage() {
  cat 1>&2 <<EOF
Installs the AWS CLI v2

USAGE:
    install [FLAGS] [OPTIONS]

FLAGS:
    -u, --update              Updates the AWS CLI v2 if a different version
                              is previously installed. By default, this script
                              will not update the AWS CLI if a previous
                              installation is detected.

    -h, --help                Prints help information

OPTIONS:
    -i, --install-dir <path>  The directory to install the AWS CLI v2. By
                              default, this directory is: /usr/local/aws-cli

    -b, --bin-dir <path>      The directory to store symlinks to executables
                              for the AWS CLI v2. By default, the directory
                              used is: /usr/local/bin
EOF
}

parse_commandline() {
  while test $# -gt 0
  do
    key="$1"
	case "$key" in
	  -i|--install-dir)
	    PARSED_INSTALL_DIR="$2"
		shift
	   ;;
	  -b|--bin-dir)
	    PARSED_BIN_DIR="$2"
		shift
	   ;;
	  -u|--update)
	    PARSED_UPGRADE="yes"
	  ;;
	  -h|--help)
	    usage
        exit 0
	  ;;
	  *)
	   die "Got an unexpected argument: $1"
	  ;;
    esac
	shift
  done
}

set_global_vars() {
  ROOT_INSTALL_DIR=${PARSED_INSTALL_DIR:-/usr/local/aws-cli}
  BIN_DIR=${PARSED_BIN_DIR:-/usr/local/bin}
  UPGRADE=${PARSED_UPGRADE:-no}

  EXE_NAME="aws"
  COMPLETER_EXE_NAME="aws_completer"
  INSTALLER_DIR="$( cd "$( dirname "$0" )" >/dev/null 2>&1 && pwd )"
  INSTALLER_DIST_DIR="$INSTALLER_DIR/dist"
  INSTALLER_EXE="$INSTALLER_DIST_DIR/$EXE_NAME"
  AWS_EXE_VERSION=$($INSTALLER_EXE --version | cut -d ' ' -f 1 | cut -d '/' -f 2)

  INSTALL_DIR="$ROOT_INSTALL_DIR/v2/$AWS_EXE_VERSION"
  INSTALL_DIR="$INSTALL_DIR"
  INSTALL_DIST_DIR="$INSTALL_DIR/dist"
  INSTALL_BIN_DIR="$INSTALL_DIR/bin"
  INSTALL_AWS_EXE="$INSTALL_BIN_DIR/$EXE_NAME"
  INSTALL_AWS_COMPLETER_EXE="$INSTALL_BIN_DIR/$COMPLETER_EXE_NAME"

  CURRENT_INSTALL_DIR="$ROOT_INSTALL_DIR/v2/current"
  CURRENT_AWS_EXE="$CURRENT_INSTALL_DIR/bin/$EXE_NAME"
  CURRENT_AWS_COMPLETER_EXE="$CURRENT_INSTALL_DIR/bin/$COMPLETER_EXE_NAME"

  BIN_AWS_EXE="$BIN_DIR/$EXE_NAME"
  BIN_AWS_COMPLETER_EXE="$BIN_DIR/$COMPLETER_EXE_NAME"
}

create_install_dir() {
  mkdir -p "$INSTALL_DIR" || exit 1
  {
    setup_install_dist &&
    setup_install_bin &&
    create_current_symlink
  } || {
    rm -rf "$INSTALL_DIR"
    exit 1
  }
}

check_preexisting_install() {
  if [ -L "$CURRENT_INSTALL_DIR" ] && [ "$UPGRADE" = "no" ]
  then
    die "Found preexisting AWS CLI installation: $CURRENT_INSTALL_DIR. Please rerun install script with --update flag."
  fi
  if [ -d "$INSTALL_DIR" ]
  then
    echo "Found same AWS CLI version: $INSTALL_DIR. Skipping install."
    exit 0
  fi
}

setup_install_dist() {
  cp -r "$INSTALLER_DIST_DIR" "$INSTALL_DIST_DIR"
}

setup_install_bin() {
  mkdir -p "$INSTALL_BIN_DIR"
  ln -s "../dist/$EXE_NAME" "$INSTALL_AWS_EXE"
  ln -s "../dist/$COMPLETER_EXE_NAME" "$INSTALL_AWS_COMPLETER_EXE"
}

create_current_symlink() {
  ln -snf "$INSTALL_DIR" "$CURRENT_INSTALL_DIR"
}

create_bin_symlinks() {
  mkdir -p "$BIN_DIR"
  ln -sf "$CURRENT_AWS_EXE" "$BIN_AWS_EXE"
  ln -sf "$CURRENT_AWS_COMPLETER_EXE" "$BIN_AWS_COMPLETER_EXE"
}

die() {
	err_msg="$1"
	echo "$err_msg" >&2
	exit 1
}

main() {
  parse_commandline "$@"
  set_global_vars
  check_preexisting_install
  create_install_dir
  create_bin_symlinks
  echo "You can now run: $BIN_AWS_EXE --version"
  exit 0
}

main "$@" || exit 1
