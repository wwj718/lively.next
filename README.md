# flatn [![Build Status](https://travis-ci.org/rksm/flatn.svg?branch=master)](https://travis-ci.org/rksm/flatn)



flat node dependencies (flatn) is a nodejs package organizer that supports flat file system structures for nodejs package dependencies.  It is compatible with npm and provides an alternative for workflows where npm falls short.

__TL;DR__
flatn installs packages into one or multiple directories and tells nodejs how to resolve packages in there so normal `require(...)` statements work.

- makes developing multiple inter-dependent packages easy (no symlinking, junction-pointing)
- more efficient package storage
- simple package lookup, friendlier to non-nodejs module systems (like SystemJS)

![](flatn.png)

## Rationale

npm installs package dependencies into node_modules folder inside of packages that require them.  The internal module resolve mechanism in nodejs then traverses the file system tree upward when it wants to load (require) one module from another one, looking into the node_modules folder to the matching package.

This has a number of negative consequences:
1. __During development__: When you develop multiple packages that depend on each other you typically don't want them to be installed like normal dependencies but rather link the packages to each other.  `npm link` allows to do this but installs the links globally, so you cannot use multiple versions of you packages under development at the same time.

2. __Performance__: In the current npm version 4, linked packages (either symlinked by hand or via `npm link`) sometimes seem to lead to very slow install / update operations, sometimes freezing the install / update process completely.

3. __Sharing__: Local packages that depend on the same dependencies each install a seperate version of them, even when `npm link`ed.  Depending on how many packages you develop this can waste considerable disk space (gigabytes) and considerably slows down install / update processes.

4. __Simplicity of module resolution algorithm and usage with other module systems__: Since npm version 3, npm tries to partially flatten out the dependency tree to avoid redundancies.  However, this has now the drawback that you cannot rely on the package.json dependency fields to find packages anymore deeper down in the tree.  You basically need to resolve packages via nodejs or use your own implementation of the npm lookup algorithm if you want to find packages with a different module system.  This complicates using node_modules especially in the browser context and with EcmaScript modules and System loaders such as SystemJS.

### Solution

1. __Custom package directories__: To solve these problems, flattn can install packages in one or multiple shared directories that differ from the normal node_modules folders.  This directory / directories can either be local to your own packages or reside somewhere else on your file system.

2. __Directories can be shared but are not global__ By specifying which directories to use via environment variables or command line arguments, installed packages can be shared by multiple local packages.  This allows to minimize the number of installed dependencies.

3. __Directory structure is flat and straightforward__: No nested package structures are necessary, packages are installed via name@version inside the specified directories, github dependencies are supported. Finding packages is done by comparing the version of the package with the version requirement of the callsite. _Versions of package dependencies are still resolved correctly, i.e. flatn supports the case that packages might require the same dependency in multiple versions._

Unlike `yarn install --flat` multiple versions of the same dependency can coexist.

By importing [module-resolver.js](module-resolver.js) into your nodejs process and specifying the package directories via environment variables, nodejs will then use those directories when it tries to load modules.  Alternatively to manually importing `module-resolver.js` you can use [bin/node](bin/node) to start nodejs.

### Comparison with npm and yarn

#### npm

The package install strategy of npm version 1 and 2 was to install all dependencies of a package it listed in `package.json` into a `node_modules` folder in the packages base directory.  Sub-packages were installed in the same way recursively.   The downside of this approach is that for lots of dependencies the node_modules folder structure can grow very large and very deep.

npm version >= 3 improves that by using a [deduplication and localization strategy](https://docs.npmjs.com/how-npm-works/npm3).  This alleviates the deep folder problem but still keeps a the `node_modules` tree structure around.  The downside of this approach is that the location of particular packages is not transparent anymore.  In order to find a package in the dependency tree one has to essentially execute the [node.js module lookup algorithm](https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders).  This becomes a problem when using packages and their dependencies in the browser or with other module systems (like [SystemJS](https://github.com/systemjs/systemjs) or [lively.modules](https://github.com/LivelyKernel/lively.modules)).

Also, sharing of installed packages across local projects is not possible.  If you have mutliple packages you develop and that are therefore not installed via npm, dependencies of those are not shared, each gets its own `node_modules` tree.  Depending on how many local projects you have this can waste gigabytes.

Furthermore, local packages do not know about each other.  If you have a `packaga-a` that requires a `package-b` you either have to place `package-b` directly inside the node_modules of `package-a` or [npm link](https://docs.npmjs.com/cli/link) `package-b` or symlink package-b => package-a.  npm link is global so you cannot have multiple versions of `package-b`.  As of npm version 5, symlinking freezes `npm update` and `npm install` processes or leads to endless recursive calls (which sometimes also happens with npm link)...

The name and location of the `node_module` folder cannot be customized.

#### yarn

The [yarn package](https://yarnpkg.com/) manager is an alternative to npm.  It uses a local cache to avoid downloading dependencies multiple times and on install links the dependencies required by the projects into `node_modules` folders.  This avoids having mutliple copies of one dependency in the system and wasting space.  To find the exact location of a particular package, one still needs to follow the nodejs module lookup algorithm.

Yarn has an option to [install flat dependencies](https://yarnpkg.com/en/docs/cli/install#toc-yarn-install-flat).  However, in the case of version conflicts, the user has to specify a resolution that picks one of the conflicting versions.  This can potentially lead to runtime issues as packages have to use the wrong version of their dependencies.

The name and location of the `node_module` folder cannot be customized (but there is a [PR].

#### flatn

flatn uses a different strategy by allowing a fully custom location or multiple locations for package dependencies.  Those dependencies can then be shared by local packages.  No symlinking happens but the [node.js runtime is extended](https://github.com/rksm/flatn/blob/master/module-resolver.js) to lookup the dependencies in the right location.  Additionally, flatn provides an option to specify development packages that are then made known to the runtime similarly and that are not constrained by their version specifiers.

### Example

Let's say we have a local package `foo` with package.json

```json
{
  "name": "foo",
  "version": "0.1.0",
  "dependencies": {
    "chalk": "^1"
  }
}
```

#### Install + require

We want to use a custom folder inside the projects directory to store the dependencies.  By running
```sh
$ mkdir deps
$ flatn --packages deps install
```

we install the "chalk" dependency inside the deps folder.  We can now set the `FLATN_PACKAGE_COLLECTION_DIRS` environment variable and run nodejs:
```sh
$ eval $( flatn --packages deps env )
$ node -p 'require("chalk").blue.bgRed.bold("it works!!!");'`
```

#### Using local packages without install

Let's say we have another module `bar` that is local and that we want to use from foo:

```sh
$ eval $( flatn --packages deps --dev-package /path/to/foo env )
$ node -p 'require("foo").doSomething(here)'`
```


## Command line usage

`npm install -g flatn` then

```
flatn – flat node dependencies

Usage: flatn [generic args] command [command args]

Generic args:
  --packages / -C	Specifies a directory whose subdirectories are expected to be all packages ("package collection" dir)
  --dev-package / -D	Specifies a development package. Dev packages will always
                    	be built and will override all packages with the same name.  When a module
                    	requires the name of a dev package, the package will always match, no matter
                    	its version.
  --package/ -P	Specifies the path to a single package
(Repeat -C/-D/-P multiple times to specify any number of directories.)



Commands:
help		Print this help
list		List all packages that can be reached via the flatn package directories
    		specified in the environment and via generic arguments.

install		Usage without name: Downloads dependencies of the package in the
       		current directory and runs build tasks (with --save and --save-dev) also adds
       		to package.json in current dir
install name	Installs the package name in the first collection package dir
       		specified. With arguments --save or --save-dev it adds this package to the
       		dependencies or devDepedencies entry of the current package's package.json
node		Starts a new nodejs process that resolves modules usin the specified
    		package directories. To path arguments to nodejs use "--" followed by any
    		normal nodejs argument(s).

Environment:
Use the environment variables
  - FLATN_PACKAGE_COLLECTION_DIRS
  - FLATN_PACKAGE_DIRS
  - FLATN_DEV_PACKAGE_DIRS
to specify package directories.  The variables correspond to the -C, -P, and -D
generic arguments.  Use ":" to specify multiple directories, e.g.
FLATN_DEV_PACKAGE_DIRS=/home/user/package1:/home/user/package2.
Note: All directories have to be absolute.
```
