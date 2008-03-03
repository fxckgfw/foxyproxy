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
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;
var fp = null;
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// MatchingProxy class ///////////////////////
function MatchingProxy() {
  this.wrappedJSObject = this;
  !fp && 
  	(fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject);   
}

MatchingProxy.prototype = {
  QueryInterface: gQueryInterface,
  
  errMsg : "", // Default value for MPs which don't have errors
  pacResult : "", // Default value for MPs which don't have PAC results (i.e., they probably don't use PACs or the PAC returned null
  _init : function() { /* one-time init to get localized msgs */
    this.randomMsg = fp.getMessage("proxy.random");
    this.allMsg = fp.getMessage("proxy.all.urls");
    this.regExMsg = fp.getMessage("foxyproxy.regex.label");
    this.wcMsg = fp.getMessage("foxyproxy.wildcard.label");
    this.blackMsg = fp.getMessage("foxyproxy.blacklist.label");
    this.whiteMsg = fp.getMessage("foxyproxy.whitelist.label");
    this.yes = fp.getMessage("yes");  
    this.no = fp.getMessage("no");    
  },
  
  init : function(proxy, aMatch, uriStr, type, errMsg) {
    this.timestamp = Date.now();  
    (!this.randomMsg && this._init());
    this.uri = uriStr;
    this.proxy = proxy;
    this.proxyName = proxy.name; // Make local copy so logg history doesn't change if user changes proxy    
    this.proxyNotes = proxy.notes;  // ""
    if (type == "pat") {
      this.matchName = aMatch.name;  // Make local copy so logg history doesn't change if user changes proxy
      this.matchPattern = aMatch.pattern; // ""
      this.matchType = aMatch.isRegEx ? this.regExMsg : this.wcMsg;  
      this.whiteBlack = aMatch.isBlackList ? this.blackMsg : this.whiteMsg; // ""
      this.caseSensitive = aMatch.caseSensitive ? this.yes : this.no; // ""
	}
	else if (type == "ded") {
	  this.caseSensitive = this.whiteBlack = this.matchName = this.matchPattern = this.matchType = this.allMsg;
	}		
	else if (type == "rand") {
    this.matchName = this.matchPattern = this.matchType = this.whiteBlack = this.randomMsg;
  }
	else if (type == "round") {
	}
	else if (type == "err") {
		this.errMsg = errMsg;
	}
	return this;
  },
	classID: Components.ID("{c5338500-f195-11da-8ad9-0800200c9a66}"),
	contractID: "@leahscape.org/foxyproxy/matchingproxy;1",
	classDescription: "FoxyProxy MatchingProxy Component"  
};


var gXpComObjects = [MatchingProxy];
var gCatObserverName = "foxyproxy_matchingproxy_catobserver";
var gCatContractId = MatchingProxy.prototype.contractID;

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
