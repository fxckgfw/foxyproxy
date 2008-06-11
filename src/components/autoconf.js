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

//dump("autoconf.js\n");
if (!CI) {
  // we're not being included by foxyproxy.js
  var CI = Components.interfaces, CC = Components.classes, CR = Components.results, fp;

  // Get attribute from node if it exists, otherwise return |def|.
  // No exceptions, no errors, no null returns.
  var gGetSafeAttr = function(n, name, def) {
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name) : def) : def;
  };
  // Boolean version of GetSafe
  var gGetSafeAttrB = function(n, name, def) {
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name)=="true" : def) : def;
  };
  // XPCOM module initialization
  var NSGetModule = function() { return AutoConfModule; }
}

///////////////////////////// AutoConf class ///////////////////////
function AutoConf(owner, fpp) {
  this.wrappedJSObject = this;
  fp = fpp || CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;    
  this.timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
  this.owner = owner;
	this._resolver = CC["@mozilla.org/network/proxy-auto-config;1"]
	  .createInstance(CI.nsIProxyAutoConfig);
}

AutoConf.prototype = {
  parser : /\s*(\S+)\s*(?:([^:]+):?(\d*)\s*[;]?\s*)?/,
  status : 0,
  error : null,
 	loadNotification: true,
  errorNotification: true,
  url: "",
  _pac: "",
  _autoReload: false,
  _reloadFreqMins: 60,

  QueryInterface: function(aIID) {
    if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  },
    
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

  fromDOM : function(n) {
    this.url = gGetSafeAttr(n, "url", "");
    this.loadNotification = gGetSafeAttrB(n, "loadNotification", true);
    this.errorNotification = gGetSafeAttrB(n, "errorNotification", true);
    this._autoReload = gGetSafeAttrB(n, "autoReload", false);
    this._reloadFreqMins = gGetSafeAttr(n, "reloadFreqMins", 60);
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
  
  cancelTimer : function() {
    this.timer.cancel();
  },

  badPAC : function(res, e) {
		if (e) {
      dump("badPAC: " + e + "\n");
      this.error = e;
    }
    this.errorNotification && fp.notifier.alert(fp.getMessage("pac.status"), fp.getMessage(res, [this.owner.name, this.status, this.error]));
    if (this.owner.lastresort)
      this.owner.mode = "direct"; // don't disable!
    else
      this.owner.enabled = false;
  }
};

var AutoConfFactory = {
  createInstance: function (aOuter, aIID) {
    if (aOuter != null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    return (new AutoConf()).QueryInterface(aIID);
  }
};

var AutoConfModule = {
  CLASS_ID : Components.ID("54382370-f194-11da-8ad9-0800200c9a66"),
  CLASS_NAME : "FoxyProxy AutoConfiguration Component",
  CONTRACT_ID : "@leahscape.org/foxyproxy/autoconf;1",
  
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(this.CLASS_ID, this.CLASS_NAME, this.CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(this.CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(this.CLASS_ID))
      return AutoConfFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};
