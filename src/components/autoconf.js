/**
  FoxyProxy
  Copyright (C) 2006,2007 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// See http://forums.mozillazine.org/viewtopic.php?t=308369

// Don't const the next line anymore because of the generic reg code
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;
var fp = null;
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// AutoConf class ///////////////////////
function AutoConf(owner, node) {
  this.wrappedJSObject = this;
  !fp &&
  	(fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject);
  this.timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
  this.owner = owner;
  this.fromDOM(node);
	this._resolver = CC["@mozilla.org/network/proxy-auto-config;1"]
	  .createInstance(CI.nsIProxyAutoConfig);
}

AutoConf.prototype = {
  QueryInterface: gQueryInterface,
  parser : /\s*(\S+)\s*(?:([^:]+):?(\d*)\s*[;]?\s*)?/,
  status : 0,
  error : null,
 	loadNotification: true,
  errorNotification: true,
  url: "",
  _pac: "",
  _autoReload: false,
  _reloadFreqMins: 60,

  set autoReload(e) {
    this._autoReload = e;
    if (!e && this.timer) {
			this.timer.cancel();
		}
   },

  get autoReload() {return this._autoReload;},

  set reloadFreqMins(e) {
  	if (isNaN(e) || e < 1) {
  		e = 60;
  	}
  	else {
	    this._reloadFreqMins = e;
	  }
   },
  get reloadFreqMins() {return this._reloadFreqMins;},

  fromDOM : function(node) {
    if (node) {
	    this.url = node.getAttribute("url");
	    this.loadNotification = node.hasAttribute("loadNotification") ? node.getAttribute("loadNotification") == "true" : true;	// new for 2.5
	    this.errorNotification = node.hasAttribute("errorNotification") ? node.getAttribute("errorNotification") == "true" : true; // new for 2.5
	    this._autoReload = node.hasAttribute("autoReload") ? node.getAttribute("autoReload") == "true" : true; // new for 2.5
	    this._reloadFreqMins = node.hasAttribute("reloadFreqMins") ? node.getAttribute("reloadFreqMins") : 60; // new for 2.5
	  }
  },

  toDOM : function(doc) {
    var e = doc.createElement("autoconf");
    e.setAttribute("url", this.url);
    e.setAttribute("loadNotification", this.loadNotification);
    e.setAttribute("errorNotification", this.errorNotification);
	  e.setAttribute("autoReload", this._autoReload);
	  e.setAttribute("reloadFreqMins", this._reloadFreqMins);
    return e;
  },

  loadPAC : function() {
    this._pac = "";
    try {
      var req = CC["@mozilla.org/xmlextras/xmlhttprequest;1"]
        .createInstance(CI.nsIXMLHttpRequest);
      req.open("GET", this.url, false); // false means synchronous
      req.send(null);
      this.status = req.status;
      if (this.status == 200 || (this.status == 0 && (this.url.indexOf("file://") == 0 || this.url.indexOf("ftp://") == 0 || this.url.indexOf("relative://") == 0))) {
        try {
          this._pac = req.responseText;
          this._resolver.init(this.url, this._pac);
          this.loadNotification && fp.notifier.alert(fp.getMessage("pac.status"), fp.getMessage("pac.status.success", [this.owner.name]));
          this.owner._enabled = true; // Use _enabled so we don't loop infinitely
          this.error = null;
        }
        catch(e) {
          this._pac = "";
          this.badPAC("pac.status.error", e);
        }
      }
      else {
        this.badPAC("pac.status.loadfailure");
      }
    }
    catch(e) {
      this.badPAC("pac.status.loadfailure", e);
    }
  },

	notify : function(timer) {
		// nsITimer callback
		this.loadPAC();
	},

  badPAC : function(res, e) {
		if (e) {
      dump(e) + "\n";
      this.error = e;
    }
    this.errorNotification && fp.notifier.alert(fp.getMessage("pac.status"), fp.getMessage(res, [this.owner.name, this.status, this.error]));
    if (this.owner.lastresort)
      this.owner.mode = "direct"; // don't disable!
    else
      this.owner.enabled = false;
  },
	classID: Components.ID("{54382370-f194-11da-8ad9-0800200c9a66}"),
	contractID: "@leahscape.org/foxyproxy/autoconf;1",
	classDescription: "FoxyProxy AutoConfiguration Component"
};


var gXpComObjects = [AutoConf];
var gCatObserverName = "foxyproxy_autoconf_catobserver";
var gCatContractId = AutoConf.prototype.contractID;

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
