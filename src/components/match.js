/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

/* A better name for this class would have been Pattern */

// See http://forums.mozillazine.org/viewtopic.php?t=308369
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;
var fp = null;
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// Match class///////////////////////
function Match() {
  this.wrappedJSObject = this;
  !fp &&
  	(fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject);
	this.name = this.pattern = "";
    // Assignment order is right-to-left. this.caseSensitive is used instead of this._caseSensitive so that
    // the final assignment forces the regex to be built.
	this.caseSensitive = this._isMultiLine = this._isRegEx = this.isBlackList = false;
	this.enabled = true;
}

Match.prototype = {
  QueryInterface: gQueryInterface,

  set pattern(p) {
    if (p==null) p = ""; // prevent null patterns
    this._pattern = p.replace(/^\s*|\s*$/g,""); // trim
    this.buildRegEx();
  },

  get pattern() {
    return this._pattern;
  },

  set isRegEx(r) {
    this._isRegEx = r;
    this.buildRegEx();
  },

  get isRegEx() {
    return this._isRegEx;
  },

  set isMultiLine(m) {
    this._isMultiLine = m;
    this.buildRegEx();
  },

  get isMultiLine() {
    return this._isMultiLine;
  },

  set caseSensitive(m) {
    this._caseSensitive = m;
    this.buildRegEx();
  },

  get caseSensitive() {
    return this._caseSensitive;
  },  

  buildRegEx : function() {
    var pat = this._pattern;
    if (!this._isRegEx) {
      // Wildcards
      pat = pat.replace(/\./g, '\\.');
      pat = pat.replace(/\*/g, '.*');
      pat = pat.replace(/\?/g, '.');
    }
    if (!this._isMultiLine) {
	    pat[0] != "^" && (pat = "^" + pat);
  	  pat[pat.length-1] != "$" && (pat = pat + "$");
  	}
  	try {
	 	  this.regex = this._caseSensitive ? new RegExp(pat) : new RegExp(pat, "i");
	 	}
	 	catch(e){
	 		// ignore--we might be in a state where the regexp is invalid because
	 		// _isRegEx hasn't been changed to false yet, so we executed the wildcard
	 		// replace() calls. however, this code is about to re-run because we'll be
	 		// changed to a wildcard and re-calculate the regex correctly.
	 	}
  },

  fromDOM : function(node) {
	  this.name = node.hasAttribute("notes") ? node.getAttribute("notes") : (node.getAttribute("name") || ""); // name was called notes in v1.0
	  this._isRegEx = node.getAttribute("isRegEx") == "true";
	  this._pattern = node.hasAttribute("pattern") ? node.getAttribute("pattern") : "";
	  this.isBlackList = node.hasAttribute("isBlackList") ? node.getAttribute("isBlackList") == "true" : false; // new for 2.0
	  this.enabled = node.hasAttribute("enabled") ? node.getAttribute("enabled") == "true" : true; // new for 2.0
	  this._isMultiLine = node.hasAttribute("isMultiLine") ? node.getAttribute("isMultiLine") == "true" : false; // new for 2.0
      // Set this.caseSensitive instead of this._caseSensitive because the latter creates the regexp.
      this.caseSensitive = node.hasAttribute("caseSensitive") ? node.getAttribute("caseSensitive") == "true" : false; // new for 2.6.3
  },

  toDOM : function(doc) {
    var matchElem = doc.createElement("match");
    matchElem.setAttribute("enabled", this.enabled);
    matchElem.setAttribute("name", this.name);
    matchElem.setAttribute("pattern", this._pattern);
    matchElem.setAttribute("isRegEx", this.isRegEx);
    matchElem.setAttribute("isBlackList", this.isBlackList);
    matchElem.setAttribute("isMultiLine", this._isMultiLine);
    matchElem.setAttribute("caseSensitive", this._caseSensitive);    
    return matchElem;
  },
	classID: Components.ID("{2b49ed90-f194-11da-8ad9-0800200c9a66}"),
	contractID: "@leahscape.org/foxyproxy/match;1",
	classDescription: "FoxyProxy Match Component"
};

var gXpComObjects = [Match];
var gCatObserverName = "foxyproxy_match_catobserver";
var gCatContractId = Match.prototype.contractID;

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
