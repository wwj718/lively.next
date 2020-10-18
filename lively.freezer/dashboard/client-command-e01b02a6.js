System.register(["./__root_module__-7cbd94df.js","kld-intersections"],function(Da){var Ab,Rb,jc,cc,je;return{setters:[function(fd){Ab=fd.$;Rb=fd.bn;jc=fd.a6;cc=fd.a7;je=fd.ar},function(){}],execute:function(){function fd(md,Za){Za=void 0===Za?{}:Za;var Db=Za.l2lClient;if(!Db)throw Error("lively.shell client side runCommand needs opts.l2lClient!");Td.ClientCommand.installLively2LivelyServices(Db);Db=new Td.ClientCommand(Db);Db.spawn(Object.assign({command:md},Td.obj.dissoc(Za,["l2lClient"])));
return Db}function Yd(md){return Td.dirCache[md.trackerId]?Td.dirCache[md.trackerId]:Promise.resolve().then(function(){var Za,Db,ac;return $jscomp.asyncExecutePromiseGeneratorProgram(function(ic){if(1==ic.nextAddress)return ic.yield(md.sendToAndWait(md.trackerId,"lively.shell.info",{}),2);Za=ic.yieldResult;Db=Za.data;ac=Db.defaultDirectory;return ic.return(Td.dirCache[md.trackerId]=ac)})})}function jd(md){var Za,Db,ac;return $jscomp.asyncExecutePromiseGeneratorProgram(function(ic){if(1==ic.nextAddress)return ic.yield(md.sendToAndWait(md.trackerId,
"lively.shell.env",{}),2);Za=ic.yieldResult;Db=Za.data;ac=Db.env;return ic.return(ac)})}function Pc(md,Za){Za=(Za=void 0===Za?{}:Za)||{};var Db=Td.runCommand('cat "'+md+'"',Za);return Db.whenDone().then(function(){if(Db.exitCode)throw Error("Read "+md+" failed: "+Db.stderr);return Db.output})}function vd(md,Za,Db){!Db&&Za&&Za.content&&(Db=Za,Za=Db.content);var ac=Td.runCommand('tee "'+md+'"',Object.assign({stdin:Za||""},Db));return ac.whenDone().then(function(){if(ac.exitCode)throw Error("Write "+
md+" failed: "+ac.stderr);return ac})}Da({defaultDirectory:Yd,env:jd,readFile:Pc,runCommand:fd,writeFile:vd});var Ld=lively.FreezerRuntime.recorderFor("lively.shell/command-interface.js");Ld.promise=Ab;Ld.events=Rb;var ge=function(){this._stderr=this._stdout="";this.exitCode=void 0;this.commandString="";this.process=null;this._whenDone=Ld.promise.deferred();this._whenStarted=Ld.promise.deferred();this.startTime=0;this.lastSignal=null;Ld.events.makeEmitter(this)};ge.findCommand=function(md){return this.commands.find(function(Za){return Za.pid===
md})};ge.prototype.isRunning=function(){return this.process&&void 0===this.exitCode};ge.prototype.isDone=function(){return void 0!=this.exitCode};ge.prototype.whenStarted=function(){return this._whenStarted.promise};ge.prototype.whenDone=function(){return this._whenDone.promise};ge.prototype.spawn=function(md){throw Error("not yet implemented");};ge.prototype.kill=function(md){this.lastSignal=void 0===md?"KILL":md};ge.prototype.toString=function(){return this.constructor.name+"("+this.commandString+
", "+this.status+")"};$jscomp.global.Object.defineProperties(ge.prototype,{isShellCommand:{configurable:!0,enumerable:!0,get:function(){return!0}},status:{configurable:!0,enumerable:!0,get:function(){return this.process?void 0===this.exitCode?"running, pid "+this.pid:"exited "+this.exitCode+", pid "+this.pid:"not started"}},pid:{configurable:!0,enumerable:!0,get:function(){return this.process?this.process.pid:null}},output:{configurable:!0,enumerable:!0,get:function(){return this.stdout+(this.stderr?
"\n"+this.stderr:"")}},stdout:{configurable:!0,enumerable:!0,get:function(){return this._stdout}},stderr:{configurable:!0,enumerable:!0,get:function(){return this._stderr}}});$jscomp.global.Object.defineProperties(ge,{commands:{configurable:!0,enumerable:!0,get:function(){return this._commands||(this._commands=[])}}});Ld.CommandInterface=ge;Ld.default=ge;var Td=lively.FreezerRuntime.recorderFor("lively.shell/client-command.js");Td.runCommand=fd;Td.defaultDirectory=Yd;Td.env=jd;Td.readFile=Pc;Td.writeFile=
vd;Td.CommandInterface=ge;Td.promise=Ab;Td.arr=jc;Td.obj=cc;Td.signal=je;Td.debug=!1;Td.runCommand=fd;Td.runCommand=fd;Td.dirCache={};Td.defaultDirectory=Yd;Td.defaultDirectory=Yd;Td.env=jd;Td.env=jd;Td.readFile=Pc;Td.readFile=Pc;Td.writeFile=vd;Td.writeFile=vd;ge=function(md){var Za=Td.CommandInterface.call(this)||this;Za.debug=Td.debug;Za.l2lClient=md;return Za};$jscomp.inherits(ge,Td.CommandInterface);ge.installLively2LivelyServices=function(md){Object.keys(Td.L2LServices).forEach(function(Za){return md.addService(Za,
function(Db,ac,ic){return $jscomp.asyncExecutePromiseGeneratorProgram(function(gd){return gd.return(Td.L2LServices[Za](Db,ac,ic))})})})};ge.prototype.envForCommand=function(md){var Za=this.l2lClient,Db=Za.id,ac=Za.origin,ic=Za.path;Za=Za.namespace;var gd=md||{};md=gd.env;gd=gd.owner;md=md||{};gd&&(md.LIVELY_COMMAND_OWNER=gd);return Object.assign({ASKPASS_SESSIONID:Db,L2L_EDITOR_SESSIONID:Db,L2L_SESSIONTRACKER_SERVER:ac,L2L_SESSIONTRACKER_PATH:ic,L2L_SESSIONTRACKER_NS:Za},md)};ge.prototype.spawn=function(md){md=
void 0===md?{command:null,env:{},cwd:null,stdin:null}:md;var Za=this,Db,ac,ic,gd,fe,Yb,qc,Ob,Hc,Yc,cd;return $jscomp.asyncExecutePromiseGeneratorProgram(function($b){if(1==$b.nextAddress)return Db=Za,ac=Db.l2lClient,ic=md,gd=ic.command,fe=ic.env,Yb=ic.cwd,qc=ic.stdin,Za.startTime=new Date,fe=Za.envForCommand(md),Za.debug&&console.log(Za+" spawning "+gd),Za.debug&&Za.whenStarted().then(function(){return console.log(Za+" started")}),Za.debug&&Za.whenDone().then(function(){return console.log(Za+" exited")}),
Td.arr.pushIfNotIncluded(Za.constructor.commands,Za),Za.commandString=Array.isArray(gd)?gd.join(""):gd,$b.yield(ac.sendToAndWait(ac.trackerId,"lively.shell.spawn",{command:gd,env:fe,cwd:Yb,stdin:qc},{ackTimeout:3E4}),2);Ob=$b.yieldResult;Hc=Ob.data;Yc=Hc.error;cd=Hc.pid;if(Yc)throw Td.debug&&console.error("["+Za+"] error at start: "+Yc),Za.process={error:Yc},Za.exitCode=1,Td.signal(Za,"error",Yc),Error(Yc);Za.process={pid:cd};Td.debug&&console.log("["+Za+"] got pid "+cd);Td.signal(Za,"pid",cd);Za._whenStarted.resolve();
return $b.return(Za)})};ge.prototype.writeToStdin=function(md){var Za=this,Db,ac,ic;return $jscomp.asyncExecutePromiseGeneratorProgram(function(gd){if(!Za.isRunning())return gd.return();Db=Za;ac=Db.l2lClient;ic=Db.pid;return gd.yield(ac.sendToAndWait(ac.trackerId,"lively.shell.writeToStdin",{pid:ic,stdin:String(md)}),0)})};ge.prototype.kill=function(md){md=void 0===md?"KILL":md;var Za=this,Db,ac,ic,gd,fe,Yb,qc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Ob){if(1==Ob.nextAddress){if(!Za.isRunning())return Ob.return();
Td.debug&&console.log(Za+" signaling "+md);Za.lastSignal=md;Db=Za;ac=Db.pid;ic=Db.l2lClient;return Ob.yield(ic.sendToAndWait(ic.trackerId,"lively.shell.kill",{pid:ac}),2)}gd=Ob.yieldResult;fe=gd.data;Yb=fe.status;qc=fe.error;Td.debug&&console.log(Za+" kill send: "+(qc||Yb));if(qc)throw Error(qc);return Ob.return(Za.whenDone())})};ge.prototype.onOutput=function(md){var Za=md.stdout;md=md.stderr;Za&&(this._stdout+=Za,Td.signal(this,"stdout",Za),this.emit("stdout",Za));md&&(this._stderr+=md,Td.signal(this,
"stderr",md),this.emit("stderr",md))};ge.prototype.onClose=function(md){Td.arr.remove(this.constructor.commands,this);this.exitCode=md;this.emit("close",md);Td.signal(this,"close",md);this._whenDone.resolve(this)};ge.prototype.onError=function(md){Td.arr.remove(this.constructor.commands,this);this._stderr+=md.stack;this.exitCode=1;this.emit("error",md.stack);Td.signal(this,"error",md.stack);this._whenDone.reject(md)};Da("default",ge);Td.ClientCommand=ge;Td.L2LServices={"lively.shell.onOutput":function(md,
Za,Db,ac){md=Za.data;var ic=md.pid,gd=md.stdout,fe=md.stderr,Yb;return $jscomp.asyncExecutePromiseGeneratorProgram(function(qc){switch(qc.nextAddress){case 1:return Td.debug&&console.log("[lively.shell] client received lively.shell.onOutput for command "+ic),qc.setCatchFinallyBlocks(2),qc.yield(Td.promise.waitFor(1E3,function(){return Td.ClientCommand.findCommand(ic)}),4);case 4:Yb=qc.yieldResult;qc.leaveTryBlock(3);break;case 2:return qc.enterCatchBlock(),console.warn("[lively.shell] received output for command "+
ic+" but it isn't registered!'"),qc.return();case 3:Yb.onOutput({stdout:gd,stderr:fe}),qc.jumpToEnd()}})},"lively.shell.onExit":function(md,Za,Db,ac){md=Za.data;var ic=md.pid,gd=md.code,fe=md.error,Yb;return $jscomp.asyncExecutePromiseGeneratorProgram(function(qc){switch(qc.nextAddress){case 1:return Td.debug&&console.log("[lively.shell] client received lively.shell.onExit for command "+ic),qc.setCatchFinallyBlocks(2),qc.yield(Td.promise.waitFor(1E3,function(){return Td.ClientCommand.findCommand(ic)}),
4);case 4:Yb=qc.yieldResult;qc.leaveTryBlock(3);break;case 2:return qc.enterCatchBlock(),console.warn("[lively.shell] received exit message for command "+ic+" but it isn't registered!'"),qc.return();case 3:if(fe)"string"===typeof fe&&(fe=Error(fe)),Yb.onError(fe);else Yb.onClose(gd);qc.jumpToEnd()}})}};Td.default=ge}}});