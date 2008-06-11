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

//dump("match.js\n");
// See http://forums.mozillazine.org/viewtopic.php?t=308369
if (!CI) {
  var CI = Components.interfaces, CC = Components.classes, CR = Components.results;

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
  var NSGetModule = function() { return MatchModule; }
}
///////////////////////////// Match class///////////////////////
function Match(enabled, name, pattern, temp, isRegEx, caseSensitive, isBlackList, isMultiLine) {
  this.wrappedJSObject = this;
  this.init.apply(this, arguments);
}

Match.prototype = {
  enabled : true,
  name : "",
  pattern : "",
  temp : false,
  _isRegEx : false,
  _caseSensitive : false,
  isBlackList : false,
  isMultiLine : false,
  
  QueryInterface: function(aIID) {
    if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  },
  
  clone : function() {
    return new Match(this.enabled, this.name, this.pattern, this.temp, this.isRegEx, this.caseSensitive,
      this.isBlackList, this.isMultiLine);
  },
  
  init : function(enabled, name, pattern, temp, isRegEx, caseSensitive, isBlackList, isMultiLine) {
    this.enabled = arguments.length > 0 ? arguments[0] : true;
    this.name = name || "";
    this.pattern = pattern || "";
    this.temp = arguments.length > 3 ? arguments[3] : false; // doesn't calculate the regex
    this._isRegEx = arguments.length > 4 ? arguments[4] : false;
    this._caseSensitive = arguments.length > 5 ? arguments[5] : false;
    this.isBlackList = arguments.length > 6 ? arguments[6] : false;  
    // this.isMultiLine is used instead of this._isMultiLine so that
    // this final assignment forces the regex to be built.
    this.isMultiLine = arguments.length > 7 ? arguments[7] : false;
  },

  set pattern(p) {
    if (!p) p = ""; // prevent null patterns
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
      pat = pat.replace(/\./g, "\\.");
      pat = pat.replace(/\*/g, ".*");
      pat = pat.replace(/\?/g, ".");
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

  fromDOM : function(n) {
    var notes = gGetSafeAttr(n, "notes", "");  // name was called notes in v1.0
	  this.name = gGetSafeAttr(n, "name", notes);
	  this._isRegEx = gGetSafeAttrB(n, "isRegEx", false);
	  this._pattern = gGetSafeAttr(n, "pattern", "");
	  this.isBlackList = gGetSafeAttrB(n, "isBlackList", false);
	  this.enabled = gGetSafeAttrB(n, "enabled", true);
	  this._isMultiLine = gGetSafeAttrB(n, "isMultiLine", false);
    // Set this.caseSensitive instead of this._caseSensitive because the latter creates the regexp.
    this.caseSensitive = gGetSafeAttrB(n, "caseSensitive", false);
    // We don't deserialize this.temp because it's not serialized
  },

  toDOM : function(doc) {
    if (this.temp) return;
    var matchElem = doc.createElement("match");
    matchElem.setAttribute("enabled", this.enabled);
    matchElem.setAttribute("name", this.name);
    matchElem.setAttribute("pattern", this._pattern);
    matchElem.setAttribute("isRegEx", this.isRegEx);
    matchElem.setAttribute("isBlackList", this.isBlackList);
    matchElem.setAttribute("isMultiLine", this._isMultiLine);
    matchElem.setAttribute("caseSensitive", this._caseSensitive);    
    return matchElem;
  }
};

var MatchFactory = {
  createInstance: function (aOuter, aIID) {
    if (aOuter != null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    return (new Match()).QueryInterface(aIID);
  }
};

var MatchModule = {
  CLASS_ID : Components.ID("2b49ed90-f194-11da-8ad9-0800200c9a66"),
  CLASS_NAME : "FoxyProxy Match Component",
  CONTRACT_ID : "@leahscape.org/foxyproxy/match;1",

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
      return MatchFactory;

    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};
