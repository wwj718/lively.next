System.register(["./__root_module__-f9290433.js","kld-intersections"],function(sa){var db,Eb,Vb,Wb,wd;return{setters:[function(Ic){db=Ic._;Eb=Ic.bk;Vb=Ic.a4;Wb=Ic.a5;wd=Ic.ap},function(){}],execute:function(){function Ic(Xc,Ra){Ra=void 0===Ra?{}:Ra;var wb=Ra.l2lClient;if(!wb)throw Error("lively.shell client side runCommand needs opts.l2lClient!");qd.ClientCommand.installLively2LivelyServices(wb);wb=new qd.ClientCommand(wb);wb.spawn(Object.assign({command:Xc},qd.obj.dissoc(Ra,["l2lClient"])));
return wb}function Ad(Xc){return qd.dirCache[Xc.trackerId]?qd.dirCache[Xc.trackerId]:Promise.resolve().then(function(){var Ra,wb,mc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(dc){if(1==dc.nextAddress)return dc.yield(Xc.sendToAndWait(Xc.trackerId,"lively.shell.info",{}),2);Ra=dc.yieldResult;wb=Ra.data;mc=wb.defaultDirectory;return dc.return(qd.dirCache[Xc.trackerId]=mc)})})}function Jc(Xc){var Ra,wb,mc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(dc){if(1==dc.nextAddress)return dc.yield(Xc.sendToAndWait(Xc.trackerId,
"lively.shell.env",{}),2);Ra=dc.yieldResult;wb=Ra.data;mc=wb.env;return dc.return(mc)})}function Mc(Xc,Ra){Ra=(Ra=void 0===Ra?{}:Ra)||{};var wb=qd.runCommand('cat "'+Xc+'"',Ra);return wb.whenDone().then(function(){if(wb.exitCode)throw Error("Read "+Xc+" failed: "+wb.stderr);return wb.output})}function bd(Xc,Ra,wb){!wb&&Ra&&Ra.content&&(wb=Ra,Ra=wb.content);var mc=qd.runCommand('tee "'+Xc+'"',Object.assign({stdin:Ra||""},wb));return mc.whenDone().then(function(){if(mc.exitCode)throw Error("Write "+
Xc+" failed: "+mc.stderr);return mc})}sa({defaultDirectory:Ad,env:Jc,readFile:Mc,runCommand:Ic,writeFile:bd});var ed=lively.FreezerRuntime.recorderFor("lively.shell/command-interface.js");ed.promise=db;ed.events=Eb;var Od=function(){this._stderr=this._stdout="";this.exitCode=void 0;this.commandString="";this.process=null;this._whenDone=ed.promise.deferred();this._whenStarted=ed.promise.deferred();this.startTime=0;this.lastSignal=null;ed.events.makeEmitter(this)};Od.findCommand=function(Xc){return this.commands.find(function(Ra){return Ra.pid===
Xc})};Od.prototype.isRunning=function(){return this.process&&void 0===this.exitCode};Od.prototype.isDone=function(){return void 0!=this.exitCode};Od.prototype.whenStarted=function(){return this._whenStarted.promise};Od.prototype.whenDone=function(){return this._whenDone.promise};Od.prototype.spawn=function(Xc){throw Error("not yet implemented");};Od.prototype.kill=function(Xc){this.lastSignal=void 0===Xc?"KILL":Xc};Od.prototype.toString=function(){return this.constructor.name+"("+this.commandString+
", "+this.status+")"};$jscomp.global.Object.defineProperties(Od.prototype,{isShellCommand:{configurable:!0,enumerable:!0,get:function(){return!0}},status:{configurable:!0,enumerable:!0,get:function(){return this.process?void 0===this.exitCode?"running, pid "+this.pid:"exited "+this.exitCode+", pid "+this.pid:"not started"}},pid:{configurable:!0,enumerable:!0,get:function(){return this.process?this.process.pid:null}},output:{configurable:!0,enumerable:!0,get:function(){return this.stdout+(this.stderr?
"\n"+this.stderr:"")}},stdout:{configurable:!0,enumerable:!0,get:function(){return this._stdout}},stderr:{configurable:!0,enumerable:!0,get:function(){return this._stderr}}});$jscomp.global.Object.defineProperties(Od,{commands:{configurable:!0,enumerable:!0,get:function(){return this._commands||(this._commands=[])}}});ed.CommandInterface=Od;ed.default=Od;var qd=lively.FreezerRuntime.recorderFor("lively.shell/client-command.js");qd.runCommand=Ic;qd.defaultDirectory=Ad;qd.env=Jc;qd.readFile=Mc;qd.writeFile=
bd;qd.CommandInterface=Od;qd.promise=db;qd.arr=Vb;qd.obj=Wb;qd.signal=wd;qd.debug=!1;qd.runCommand=Ic;qd.runCommand=Ic;qd.dirCache={};qd.defaultDirectory=Ad;qd.defaultDirectory=Ad;qd.env=Jc;qd.env=Jc;qd.readFile=Mc;qd.readFile=Mc;qd.writeFile=bd;qd.writeFile=bd;Od=function(Xc){var Ra=qd.CommandInterface.call(this)||this;Ra.debug=qd.debug;Ra.l2lClient=Xc;return Ra};$jscomp.inherits(Od,qd.CommandInterface);Od.installLively2LivelyServices=function(Xc){Object.keys(qd.L2LServices).forEach(function(Ra){return Xc.addService(Ra,
function(wb,mc,dc){return $jscomp.asyncExecutePromiseGeneratorProgram(function(Rc){return Rc.return(qd.L2LServices[Ra](wb,mc,dc))})})})};Od.prototype.envForCommand=function(Xc){var Ra=this.l2lClient,wb=Ra.id,mc=Ra.origin,dc=Ra.path;Ra=Ra.namespace;var Rc=Xc||{};Xc=Rc.env;Rc=Rc.owner;Xc=Xc||{};Rc&&(Xc.LIVELY_COMMAND_OWNER=Rc);return Object.assign({ASKPASS_SESSIONID:wb,L2L_EDITOR_SESSIONID:wb,L2L_SESSIONTRACKER_SERVER:mc,L2L_SESSIONTRACKER_PATH:dc,L2L_SESSIONTRACKER_NS:Ra},Xc)};Od.prototype.spawn=function(Xc){Xc=
void 0===Xc?{command:null,env:{},cwd:null,stdin:null}:Xc;var Ra=this,wb,mc,dc,Rc,Tc,zc,Fc,Jb,Ac,Bc,fd;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Qb){if(1==Qb.nextAddress)return wb=Ra,mc=wb.l2lClient,dc=Xc,Rc=dc.command,Tc=dc.env,zc=dc.cwd,Fc=dc.stdin,Ra.startTime=new Date,Tc=Ra.envForCommand(Xc),Ra.debug&&console.log(Ra+" spawning "+Rc),Ra.debug&&Ra.whenStarted().then(function(){return console.log(Ra+" started")}),Ra.debug&&Ra.whenDone().then(function(){return console.log(Ra+" exited")}),
qd.arr.pushIfNotIncluded(Ra.constructor.commands,Ra),Ra.commandString=Array.isArray(Rc)?Rc.join(""):Rc,Qb.yield(mc.sendToAndWait(mc.trackerId,"lively.shell.spawn",{command:Rc,env:Tc,cwd:zc,stdin:Fc},{ackTimeout:3E4}),2);Jb=Qb.yieldResult;Ac=Jb.data;Bc=Ac.error;fd=Ac.pid;if(Bc)throw qd.debug&&console.error("["+Ra+"] error at start: "+Bc),Ra.process={error:Bc},Ra.exitCode=1,qd.signal(Ra,"error",Bc),Error(Bc);Ra.process={pid:fd};qd.debug&&console.log("["+Ra+"] got pid "+fd);qd.signal(Ra,"pid",fd);Ra._whenStarted.resolve();
return Qb.return(Ra)})};Od.prototype.writeToStdin=function(Xc){var Ra=this,wb,mc,dc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Rc){if(!Ra.isRunning())return Rc.return();wb=Ra;mc=wb.l2lClient;dc=wb.pid;return Rc.yield(mc.sendToAndWait(mc.trackerId,"lively.shell.writeToStdin",{pid:dc,stdin:String(Xc)}),0)})};Od.prototype.kill=function(Xc){Xc=void 0===Xc?"KILL":Xc;var Ra=this,wb,mc,dc,Rc,Tc,zc,Fc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Jb){if(1==Jb.nextAddress){if(!Ra.isRunning())return Jb.return();
qd.debug&&console.log(Ra+" signaling "+Xc);Ra.lastSignal=Xc;wb=Ra;mc=wb.pid;dc=wb.l2lClient;return Jb.yield(dc.sendToAndWait(dc.trackerId,"lively.shell.kill",{pid:mc}),2)}Rc=Jb.yieldResult;Tc=Rc.data;zc=Tc.status;Fc=Tc.error;qd.debug&&console.log(Ra+" kill send: "+(Fc||zc));if(Fc)throw Error(Fc);return Jb.return(Ra.whenDone())})};Od.prototype.onOutput=function(Xc){var Ra=Xc.stdout;Xc=Xc.stderr;Ra&&(this._stdout+=Ra,qd.signal(this,"stdout",Ra),this.emit("stdout",Ra));Xc&&(this._stderr+=Xc,qd.signal(this,
"stderr",Xc),this.emit("stderr",Xc))};Od.prototype.onClose=function(Xc){qd.arr.remove(this.constructor.commands,this);this.exitCode=Xc;this.emit("close",Xc);qd.signal(this,"close",Xc);this._whenDone.resolve(this)};Od.prototype.onError=function(Xc){qd.arr.remove(this.constructor.commands,this);this._stderr+=Xc.stack;this.exitCode=1;this.emit("error",Xc.stack);qd.signal(this,"error",Xc.stack);this._whenDone.reject(Xc)};sa("default",Od);qd.ClientCommand=Od;qd.L2LServices={"lively.shell.onOutput":function(Xc,
Ra,wb,mc){Xc=Ra.data;var dc=Xc.pid,Rc=Xc.stdout,Tc=Xc.stderr,zc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Fc){switch(Fc.nextAddress){case 1:return qd.debug&&console.log("[lively.shell] client received lively.shell.onOutput for command "+dc),Fc.setCatchFinallyBlocks(2),Fc.yield(qd.promise.waitFor(1E3,function(){return qd.ClientCommand.findCommand(dc)}),4);case 4:zc=Fc.yieldResult;Fc.leaveTryBlock(3);break;case 2:return Fc.enterCatchBlock(),console.warn("[lively.shell] received output for command "+
dc+" but it isn't registered!'"),Fc.return();case 3:zc.onOutput({stdout:Rc,stderr:Tc}),Fc.jumpToEnd()}})},"lively.shell.onExit":function(Xc,Ra,wb,mc){Xc=Ra.data;var dc=Xc.pid,Rc=Xc.code,Tc=Xc.error,zc;return $jscomp.asyncExecutePromiseGeneratorProgram(function(Fc){switch(Fc.nextAddress){case 1:return qd.debug&&console.log("[lively.shell] client received lively.shell.onExit for command "+dc),Fc.setCatchFinallyBlocks(2),Fc.yield(qd.promise.waitFor(1E3,function(){return qd.ClientCommand.findCommand(dc)}),
4);case 4:zc=Fc.yieldResult;Fc.leaveTryBlock(3);break;case 2:return Fc.enterCatchBlock(),console.warn("[lively.shell] received exit message for command "+dc+" but it isn't registered!'"),Fc.return();case 3:if(Tc)"string"===typeof Tc&&(Tc=Error(Tc)),zc.onError(Tc);else zc.onClose(Rc);Fc.jumpToEnd()}})}};qd.default=Od}}});