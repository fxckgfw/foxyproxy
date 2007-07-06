/*** Generic JS XPCOM registration code.
/*** Eric H. Jung (eric.jung @ yahoo.com), inspired by Mook's about:kitchensink.
/*** Copyright (C) 2006 LeahScape, Inc. and Eric H. Jung (eric.jung@yahoo.com) */

/* Enter filenames that contain XPCOM components in the |modules| array.
Enter names of all components/classes in all files listed in the modules array
in the array named |components| at the end of this file.

Each file named in the modules array must define a function called __registration() which
returns an object with the following properties:

-topics (an array of topics to observe)
-observerName
-contractId
-classId
-constructor (name of the ctor function)
-className

Example:
__registration: function() {
  return ({topics: ["app-startup", "xpcom-shutdown"],
    observerName: "foxyproxy_catobserver",
	contractId: "@leahscape.org/foxyproxy/service;1",
	classId: Components.ID("{46466e13-16ab-4565-9924-20aac4d98c82}"),
	constructor: foxyproxy,
	className: "FoxyProxy Core"});
}		

The files need not define *any* other XPCOM/mozilla-related code in order to be
used as an XPCOM service or component.

*/
var modules = [ "superadd.js", "foxyproxy.js", "proxy.js"];

function DumpException(e) {
  try {
    dump("File: " + e.filename + "\n");
    dump("Line: " + e.lineNumber + "\n");
    if (e.location) {
      dump("Stack File: " + e.location.filename + "\n");
      dump("Stack Line: " + e.location.lineNumber + "\n");
      dump("Stack Source: " + e.location.sourceLine + "\n");
    }
  }
  catch(e) {
    dump("Can't complete dump: " + e + "\n");
  }
  dump("Complete exception is " + e + "\n\n");
}

function isSeaMonkey() {
  const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}"; 
  var nsIXULAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                .getService(Components.interfaces.nsIXULAppInfo);
  return (nsIXULAppInfo.ID == SEAMONKEY_ID);
}

// This anonymous function executes when this file is read
(function(){
	const CI = Components.interfaces, CC = Components.classes, CR = Components.results;
  var self;
  var fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].createInstance(CI["nsIFileProtocolHandler"]);
  if ("undefined" != typeof(__LOCATION__)) {
    // preferred way
    self = __LOCATION__;
  }
  else {
    self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
  }
  var dir = self.parent; // the directory this file is in
  var loader = CC["@mozilla.org/moz/jssubscript-loader;1"].createInstance(CI["mozIJSSubScriptLoader"]);
  
  // Load each file in the modules array
  for (var i in modules) {
    try {
      var filePath = dir.clone();
      if (isSeaMonkey)
        filePath.append("foxyproxy");
      filePath.append(modules[i]);
      // filePath is a nsILocalFile of the file we want to load
      var f = fileProtocolHandler.getURLSpecFromFile(filePath);
      loader.loadSubScript(f);
    }
    catch (e) {
      DumpException(e);
      throw(e);
    }
  }
})();

function ComponentInfo(o) {
  if (typeof(o.prototype.__registration) != "function") {
    dump("Please define function __registration() in all XPCOM components\n");
  }
	var r = o.prototype.__registration();
  this.classId = r.classId;
  this.contractId = r.contractId;
  this.className  = r.className;
  this.topics = r.topics;
  this.observerName = r.observerName;
  this.factory = {
    createInstance: function(aOuter, aIID) {
      if (aOuter)
        throw CR.NS_ERROR_NO_AGGREGATION;
      return (new this.constructor).QueryInterface(aIID);
    }
  };
  this.factory.constructor = r.constructor;    
}
 
// Debug fcn
ComponentInfo.prototype.printMe = function() {
	dump("this.classId = " + this.classId + "\n");
	dump("this.contractId = " + this.contractId + "\n");
	dump("this.className = " + this.className + "\n");
	dump("this.topics = " + this.topics + "\n");
	dump("this.observerName = " + this.observerName + "\n");
	dump("this.factory = " + this.factory + "\n");
	dump("this.factory.constructor = " + this.factory.constructor + "\n");
}
 
function NSGetModule(compMgr, filespec) {
	var gModule = {
		CI : Components.interfaces,
		CC : Components.classes,
		CR : Components.results,
		
	  registerSelf: function (aCompMgr, aFileSpec, aLocation, aType) {
	  	try {
			var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);  
		    aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
		    for (var i in this._objects) {
		      var obj = this._objects[i];
		      //dump("*** Registering: " + obj.printMe() + "\n");
		      aCompMgr.registerFactoryLocation(obj.classId, obj.className, obj.contractId, aFileSpec, aLocation, aType);
		      if (obj.topics && obj.observerName) {
			      for (var j in obj.topics) {
			       	var contractId = obj.contractId;
			       	if (obj.topics[j] == "app-startup") {
			       	  // Weird hack needed for app-startup.
			       	  // See my user comment at http://www.xulplanet.com/tutorials/mozsdk/observerserv.php
			       	  contractId = "service," + contractId;
			     	}    		
			       	catman.addCategoryEntry(obj.topics[j], obj.observerName, contractId, true, true);
			      }
			    }
		    }    
		  }
		  catch (e) {
		    DumpException(e);
		  }
	  },
	
	  unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
			var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);  
	    aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
	    for (var i in this._objects) {
	      var obj = this._objects[i];
	      for (var j in obj.topics) {
					catman.deleteCategoryEntry(obj.topics[j], obj.observerName, true);     
	      }      
	      aCompMgr.unregisterFactoryLocation(obj.classId, aFileSpec);
	    }
	  },
	
	  getClassObject: function(aCompMgr, aCID, aIID) {
	    if (!aIID.equals(CI.nsIFactory)) throw CR.NS_ERROR_NOT_IMPLEMENTED;
	    for (var i in this._objects) {
	      if (aCID.equals(this._objects[i].classId))
	        return this._objects[i].factory;
	    }   
	    throw CR.NS_ERROR_NO_INTERFACE;
	  },
	
	  canUnload: function(aCompMgr) {
	    return true;
	  },
	
	  _objects: {} //ComponentInfo instances go here
	};

  // Enter names of all components in all files in this array
  var components = [foxyproxy, MatchingProxy, Proxy, Match, ManualConf, AutoConf];
  for (var i in components) {
    gModule._objects[i] = new ComponentInfo(components[i]);
  }
  return gModule;
}  
