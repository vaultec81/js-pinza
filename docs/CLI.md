# IPFS CLI 

## Table of contents 
* Install
* Commands

## Install
In order to use Pinza as a CLI, you must install it with the global flag.


`
npm install pinza --global
`

## Commands

### Main

```
pinza [command]

Commands:
  pinza cluster <command>                Access cluster specific commands.
  pinza config <key> [value]             Get and set Pinza config values.
  pinza daemon                           Start a long-running daemon process
  pinza init [default-config] [options]  Initialize a local Pinza node.
  pinza completion                       generate completion script

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]

```
### Cluster 

```
pinza cluster <command>

Access cluster specific commands.

Commands:
  pinza cluster commitment             prints out a list of CIDs commited to
                                       this node
  pinza cluster export                 Exports pinset
  pinza cluster import                 Imports pinset
  pinza cluster pin <command>          Manage pins associated with a pinza
                                       cluster
  pinza cluster create <name>          Creates a new pinza cluster
  pinza cluster join <name> <address>  Joins a Pinza cluster. Syncing data to
                                       this node from cluster
  pinza cluster leave <name>           Leaves a Pinza cluster. Removing all data
                                       associated with this cluster. There is no
                                       guarantee you can rejoin.
  pinza cluster open <name>            Opens a pinza cluster
  pinza cluster list                   List Pinza clusters

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
  --cluster  name of cluster                                            [string]
```