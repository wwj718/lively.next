System.register(["./__root_module__-f9290433.js","kld-intersections","./client-command-2bd55d63.js"],function(sa){var db,Eb,Vb,Wb,wd,Ic;return{setters:[function(Ad){db=Ad.s;Eb=Ad._;Vb=Ad.a4;Wb=Ad.bC;wd=Ad.a5},function(){},function(Ad){Ic=Ad.runCommand}],execute:function(){function Ad(Ra,wb){var mc,dc,Rc,Tc,zc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Fc){if(1==Fc.nextAddress)return mc=ed.fileInfoCommandString(Ra,wb),dc=ed.runCommand(mc,wb),Fc.yield(dc.whenDone(),2);if(Rc=0!=
dc.exitCode?dc.output:null)throw Rc;Tc=$jscomp.makeIterator(ed.parseDirectoryListFromLs(dc.stdout,wb.rootDirectory||"."));zc=Tc.next().value;return Fc.return(zc)})}function Jc(Ra,wb){return ed.string.lines(Ra).map(function(mc){return mc.trim().length?(new ed.FileInfo(wb)).readFromDirectoryListLine(mc):null}).filter(Boolean)}function Mc(Ra,wb){var mc,dc,Rc,Tc,zc,Fc,Jb,Ac,Bc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(fd){mc=Object.assign({findFilesGroup:"default-find-files-process"},
wb);dc=mc.findFilesGroup;Rc=mc.rootDirectory;zc=Tc=ed.findFilesProcesses[dc]||(ed.findFilesProcesses[dc]={promiseState:null,commands:[]});Fc=zc.commands;Jb=zc.promiseState;Jb||(Tc.promiseState=Jb=ed.promise.deferred());Ac=ed.findFilesCommandString(Ra,wb);Fc.forEach(function(Qb){return Qb.kill()});Bc=ed.runCommand(Ac,wb);Fc.push(Bc);Bc.whenDone().then(function(){ed.arr.remove(Fc,Bc);if(Fc.some(function(xb){return xb.startTime>Bc.startTime}))console.log("[findFiles] command "+Bc+" exited but a newer findFiles command was started for group "+
dc+", discarding output");else{var Qb=0!=Bc.exitCode?Bc.output:null;Qb&&console.warn(Qb);Qb=Qb?[]:ed.parseDirectoryListFromLs(Bc.stdout,Rc)||[];Jb.resolve(Qb);Object.assign(Tc,{promiseState:null,commands:[]})}}).catch(function(Qb){return console.error(Qb)});return fd.return(Jb.promise)})}function bd(Ra){function wb(mc){return Array.prototype.concat.apply([mc],mc.children?mc.children.map(wb):[])}return wb(Ra).map(function(mc){var dc=mc.fullPath.replace(/^\//,"");return{fileName:dc,path:dc,rootDirectory:"./",
isDirectory:mc.isDirectory,isLink:void 0,lastModified:void 0,linkCount:void 0,mode:void 0,size:void 0,group:void 0,user:void 0}})}var ed=lively.FreezerRuntime.recorderFor("lively.shell/client-fs-helper.js");ed.fileInfo=Ad;ed.fileInfoCommandString=function(Ra,wb){var mc=wb=void 0===wb?{}:wb;wb=mc.rootDirectory;mc=mc.platform;wb=wb||".";var dc="win32"===mc?"\\":"/";"win32"===mc||wb.endsWith(dc)||(wb+=dc);return"win32"===mc?"cd "+wb+' && ls -lLd --time-style=locale "'+Ra+'"':'if [ "$(uname)" = "Darwin" ];\n      then timeformat=\'-T\'; else\n      timeformat="--time-style=+%b %d %T %Y";\n    fi && env TZ=GMT LANG=en_US.UTF-8 cd '+
(wb+' && ls -lLd "$timeformat" "'+Ra+'"')};ed.parseDirectoryListFromLs=Jc;ed.findFiles=Mc;ed.findFilesCommandString=function(Ra,wb){var mc=wb=void 0===wb?{}:wb,dc=mc.rootDirectory,Rc=mc.exclude,Tc=mc.depth;mc=mc.platform;dc=dc||".";Rc=Rc||"-iname "+ed.defaultExcludes.map(ed.string.print).join(" -o -iname ");var zc="win32"===mc?"\\":"/";"win32"===mc||dc.endsWith(zc)||(dc+=zc);Ra=ed.string.format('%s "%s"',wb.re?"-iregex":wb.matchPath?"-ipath":"-iname",Ra);Tc="number"===typeof Tc?" -maxdepth "+Tc:"";
return"win32"===mc?ed.string.format("find %s %s ( %s ) -prune -o %s %s -print0 | xargs -0 -I{} ls -lLd --time-style=locale {}",dc,wb.re?"-E ":"",Rc.replace(/"/g,""),Ra.replace(/"/g,""),Tc):'if [ "$(uname)" = "Darwin" ];\n      then timeformat=\'-T\'; else\n      timeformat="--time-style=+%b %d %T %Y";\n    fi && '+ed.string.format('env TZ=GMT LANG=en_US.UTF-8 find %s %s \\( %s \\) -prune -o %s %s -print0 | xargs -0 -I{} ls -lLd "$timeformat" "{}"',dc,wb.re?"-E ":"",Rc,Ra,Tc)};ed.convertDirectoryUploadEntriesToFileInfos=
bd;ed.runCommand=Ic;ed.string=db;ed.promise=Eb;ed.arr=Vb;ed.fileInfo=Ad;ed.fileInfo=Ad;ed.parseDirectoryListFromLs=Jc;ed.parseDirectoryListFromLs=Jc;var Od=function(Ra){this.rootDirectory=Ra;this.fileName=this.path="";this.isDirectory=!1;this.lastModified=null;this.mode="";this.isLink=!1;this.linkCount=0;this.group=this.user="";this.size=0;this.rootDirectory=null};Od.prototype.readFromDirectoryListLine=function(Ra){var wb=this;if(!Ra.trim().length)return null;var mc=Ra;this.reader.forEach(function(dc){return mc=
dc(mc,wb)});return this};Od.prototype.toString=function(){return this.path};$jscomp.global.Object.defineProperties(Od.prototype,{reader:{configurable:!0,enumerable:!0,get:function(){return[function(Ra,wb){var mc=Ra.indexOf(" ");wb.mode=Ra.slice(0,mc);wb.isDirectory="d"===wb.mode[0];return Ra.slice(mc+1).trim()},function(Ra,wb){var mc=Ra.indexOf(" ");wb.linkCount=Number(Ra.slice(0,mc));return Ra.slice(mc+1).trim()},function(Ra,wb){var mc=Ra.indexOf(" ");wb.user=Ra.slice(0,mc);return Ra.slice(mc+1).trim()},
function(Ra,wb){var mc=ed.string.peekRight(Ra,0,/\s+[0-9]/);wb.group=Ra.slice(0,mc).trim();return Ra.slice(mc).trim()},function(Ra,wb){var mc=Ra.indexOf(" ");wb.size=Number(Ra.slice(0,mc));return Ra.slice(mc+1).trim()},function(Ra,wb){var mc=ed.string.reMatches(Ra,/[^s]+\s+[0-9:\s]+/);if(!mc||!mc[0])return Ra;wb.lastModified=new Date(mc[0].match+" GMT");return Ra.slice(mc[0].end).trim()},function(Ra,wb){var mc=(Ra=Ra.replace(/^\.\/+/g,"").replace(/\/\//g,"/"))&&Ra.split(" -> "),dc=""===Ra?!1:Ra&&
2===mc.length,Rc=(mc=dc?mc[0]:Ra)&&0===mc.indexOf(wb.rootDirectory)?mc.slice(wb.rootDirectory.length):mc;wb.fileName=""===Ra?".":Rc;wb.path=mc;wb.isLink=dc;return Rc}]}}});ed.FileInfo=Od;ed.findFilesProcesses={};ed.findFiles=Mc;ed.findFiles=Mc;ed.defaultExcludes=[".svn",".git","node_modules",".module_cache"];ed.convertDirectoryUploadEntriesToFileInfos=bd;ed.convertDirectoryUploadEntriesToFileInfos=bd;var qd=lively.FreezerRuntime.recorderFor("lively.shell/client-resource.js");qd.Resource=Wb;qd.runCommand=
Ic;qd.fileInfo=Ad;qd.findFiles=Mc;qd.string=db;qd.promise=Eb;qd.arr=Vb;qd.obj=wd;Od=function(Ra,wb,mc){mc=void 0===mc?{}:mc;Ra=qd.Resource.call(this,Ra)||this;Ra.options=Object.assign({},mc,{l2lClient:wb||Ra.constructor.defaultL2lClient});return Ra};$jscomp.inherits(Od,qd.Resource);Od.prototype.newResource=function(Ra){return new this.constructor(Ra,this.options.l2lClient,this.options)};Od.prototype.read=function(){var Ra=this,wb=qd.runCommand('cat "'+this.url+'"',this.options);return wb.whenDone().then(function(){if(wb.exitCode)throw Error("Read "+
Ra.url+" failed: "+wb.stderr);return wb.output})};Od.prototype.write=function(Ra){var wb=this,mc,dc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Rc){switch(Rc.nextAddress){case 1:return Ra?Rc.yield(qd.runCommand('touch "'+wb.url+'" && tee "'+wb.url+'"',Object.assign({stdin:String(Ra)},wb.options)).whenDone(),4):Rc.yield(qd.runCommand('echo -n > "'+wb.url+'"',Object.assign({},wb.options)).whenDone(),5);case 4:mc=Rc.yieldResult;Rc.jumpTo(3);break;case 5:mc=Rc.yieldResult;case 3:dc=mc;
if(dc.exitCode)throw Error("Write "+wb.url+" failed: "+dc.stderr);return Rc.return(wb)}})};Od.prototype.mkdir=function(){var Ra=this,wb;return $jscomp.asyncExecutePromiseGeneratorProgram(function(mc){if(1==mc.nextAddress)return mc.yield(qd.runCommand('mkdir -p "'+Ra.url+'"',Ra.options).whenDone(),2);wb=mc.yieldResult;if(wb.exitCode)throw Error(Ra+" cannot create directory: "+wb.stderr);return mc.return(Ra)})};Od.prototype.exists=function(){var Ra=qd.runCommand('test -d "'+this.url+'" || test -f "'+
this.url+'"',this.options);return Ra.whenDone().then(function(){return 0===Ra.exitCode})};Od.prototype.remove=function(){var Ra=this,wb=qd.runCommand('rm -rf "'+this.url+'"',this.options);return wb.whenDone().then(function(){if(wb.exitCode)throw Error("Remove of "+Ra.url+" failed: "+wb.stderr);return Ra})};Od.prototype.gzip=function(Ra){var wb=this,mc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(dc){mc=qd.runCommand('gzip > "'+wb.url+'"',Object.assign({stdin:String(Ra)},wb.options));
return dc.return(mc.whenDone().then(function(){if(mc.exitCode)throw Error("Gzip compression of "+wb.url+" failed: "+mc.stderr);return wb}))})};Od.prototype.brotli=function(Ra){var wb=this,mc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(dc){mc=qd.runCommand('brotli > "'+wb.url+'"',Object.assign({stdin:String(Ra)},wb.options));return dc.return(mc.whenDone().then(function(){if(mc.exitCode)throw Error("Brotli compression of "+wb.url+" failed: "+mc.stderr);return wb}))})};Od.prototype.readProperties=
function(){var Ra=this,wb;return $jscomp.asyncExecutePromiseGeneratorProgram(function(mc){if(1==mc.nextAddress)return mc.yield(qd.fileInfo(Ra.url,Ra.options),2);wb=mc.yieldResult;Ra.assignProperties(qd.obj.dissoc(wb,["fileName","path","rootDirectory"]));return mc.return(Ra)})};Od.prototype.dirList=function(Ra,wb){Ra=void 0===Ra?1:Ra;wb=void 0===wb?{}:wb;var mc=this,dc,Rc,Tc,zc,Fc,Jb,Ac;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Bc){if(1==Bc.nextAddress)return dc=wb,Rc=dc.exclude,
Array.isArray(Rc)&&(Rc="-iname "+Rc.map(qd.string.print).join(" -o -iname ")),Tc=mc,zc=Tc.url,Fc=Tc.options,Jb=Fc.l2lClient,Bc.yield(qd.findFiles("*",{exclude:Rc,depth:Ra,rootDirectory:zc,l2lClient:Jb}),2);Ac=Bc.yieldResult;Ac[0].path.replace(/\/$/,"")===mc.url.replace(/\/$/,"")&&Ac.shift();return Bc.return(Ac.map(function(fd){var Qb=fd.path;fd.isDirectory&&(Qb=Qb.replace(/\/?$/,"/"));Qb=new mc.constructor(Qb,Jb,mc.options);Qb.assignProperties(qd.obj.dissoc(fd,["fileName","path","rootDirectory"]));
return Qb}))})};$jscomp.global.Object.defineProperties(Od,{defaultL2lClient:{configurable:!0,enumerable:!0,get:function(){return this._defaultL2lClient||qd._defaultL2LClient},set:function(Ra){this._defaultL2lClient=qd._defaultL2LClient=Ra}}});sa("default",Od);qd.ShellClientResource=Od;qd._defaultL2LClient=qd._defaultL2LClient||void 0;var Xc=sa("resourceExtension",{name:"shell-client",matches:function(Ra){return Ra.startsWith("/")||Ra.match(/[a-z]:\\/i)},resourceClass:qd.ShellClientResource});qd.resourceExtension=
Xc;qd.resourceExtension=Xc;qd.resourceExtension=Xc;qd.default=Od}}});