/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// See http://forums.mozillazine.org/viewtopic.php?t=308369

// Don't const the next line anymore because of the generic reg code
var CI = Components.interfaces, CC = Components.classes, CR = Components.results, fp;
var proxyService = CC["@mozilla.org/network/protocol-proxy-service;1"].getService(CI.nsIProtocolProxyService);
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// ManualConf class ///////////////////////
function ManualConf(fpp) {
  this.wrappedJSObject = this;
  fp = fpp || CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
}

ManualConf.prototype = {
  QueryInterface: gQueryInterface,
  _host: "",
  _port: "",
  _socksversion: "5",
  _isSocks: false,
	        
  fromDOM : function(n) {
    this._host = gGetSafeAttr(n, "host", null) || gGetSafeAttr(n, "http", null) ||  
      gGetSafeAttr(n, "socks", null) || gGetSafeAttr(n, "ssl", null) ||
      gGetSafeAttr(n, "ftp", null) || gGetSafeAttr(n, "gopher", ""); //"host" is new for 2.5

    this._port = gGetSafeAttr(n, "port", null) || gGetSafeAttr(n, "httpport", null) ||
      gGetSafeAttr(n, "socksport", null) || gGetSafeAttr(n, "sslport", null) ||
      gGetSafeAttr(n, "ftpport", null) || gGetSafeAttr(n, "gopherport", ""); // "port" is new for 2.5
    	
    this._socksversion = gGetSafeAttr(n, "socksversion", "5");
      
	  this._isSocks = n.hasAttribute("isSocks") ? n.getAttribute("isSocks") == "true" :
    	n.getAttribute("http") ? false: 
    	n.getAttribute("ssl") ? false:
    	n.getAttribute("ftp") ? false:     	 
    	n.getAttribute("gopher") ? false:
    	n.getAttribute("socks") ? true : false; // new for 2.5
    	
	  this._makeProxy();
  },

  toDOM : function(doc)  {
    var e = doc.createElement("manualconf"); 
    e.setAttribute("host", this._host);      
    e.setAttribute("port", this._port);
    e.setAttribute("socksversion", this._socksversion);
    e.setAttribute("isSocks", this._isSocks);    
    return e;
  },  

  _makeProxy : function() {
  	if (!this._host || !this._port) {
  		return;
  	}
		this.proxy = this._isSocks ? proxyService.newProxyInfo(this._socksversion == "5"?"socks":"socks4", this._host, this._port,
		      fp.proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null): // never ignore, never failover
		      proxyService.newProxyInfo("http", this._host, this._port, 0, 0, null);
  },

  get host() {return this._host;},
  set host(e) {
  	this._host = e;
  	this._makeProxy();
  },  

  get port() {return this._port;},
  set port(e) {
  	this._port = e;
  	this._makeProxy();
  },
     
  get isSocks() {return this._isSocks;},
  set isSocks(e) {
  	this._isSocks = e;
  	this._makeProxy();
  },

  get socksversion() {return this._socksversion;},
  set socksversion(e) {
  	this._socksversion = e;
  	this._makeProxy();
  },
	classID: Components.ID("{457e4d50-f194-11da-8ad9-0800200c9a66}"),
	contractID: "@leahscape.org/foxyproxy/manualconf;1",
	classDescription: "FoxyProxy ManualConfiguration Component"         
};

var gXpComObjects = [ManualConf];
var gCatObserverName = "foxyproxy_manualconf_catobserver";
var gCatContractId = ManualConf.prototype.contractID;

function NSGetModule(compMgr, fileSpec) {
	gModule._catObserverName = gCatObserverName;
	gModule._catContractId = gCatContractId;
	
	for (var i in gXpComObjects)
		gModule._xpComObjects[i] = new gFactoryHolder(gXpComObjects[i]);
		
	return gModule;
}

function gFactoryHolder(aObj) {
	this.CID        = aObj.prototype.classID;
	this.contractID = aObj.prototype.contractID;
	this.className  = aObj.prototype.classDescription;
	this.factory =
	{
		createInstance: function(aOuter, aIID)
		{
			if (aOuter)
				throw CR.NS_ERROR_NO_AGGREGATION;
				
			return (new this.constructor).QueryInterface(aIID);
		}
	};
	
	this.factory.constructor = aObj;
}
var gModule = {
	registerSelf: function (aComponentManager, aFileSpec, aLocation, aType) {
		aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
		for (var key in this._xpComObjects)
		{
			var obj = this._xpComObjects[key];
			aComponentManager.registerFactoryLocation(obj.CID, obj.className,
			obj.contractID, aFileSpec, aLocation, aType);
		}
	},

	unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
		
		aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
		for (var key in this._xpComObjects)
		{
			var obj = this._xpComObjects[key];
			aComponentManager.unregisterFactoryLocation(obj.CID, aFileSpec);
		}
	},

	getClassObject: function(aComponentManager, aCID, aIID)	{
		if (!aIID.equals(CI.nsIFactory))
			throw CR.NS_ERROR_NOT_IMPLEMENTED;
		
		for (var key in this._xpComObjects)
		{
			if (aCID.equals(this._xpComObjects[key].CID))
				return this._xpComObjects[key].factory;
		}
	
		throw CR.NS_ERROR_NO_INTERFACE;
	},

	canUnload: function(aComponentManager) { return true; },
	
	_xpComObjects: {},
	_catObserverName: null,
	_catContractId: null
};
