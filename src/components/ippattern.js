/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

dump("ippattern.js\n");
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
  var NSGetModule = function() { return IPPatternModule; }
}

function IPPattern(enabled, name, pattern, temp, isBlackList) {
  this.wrappedJSObject = this;
  this.init.apply(this, arguments);
}

IPPattern.prototype = {
  enabled : true,
  name : "",
  pattern : "",
  temp : false,
  isBlackList : false,
  maskStr : "255.255.255.255",
  
  QueryInterface: function(aIID) {
    if (!aIID.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  },
  
  clone : function() {
    return new IPPattern(this.enabled, this.name, this.pattern, this.temp, this.isBlackList);
  },
  
  init : function(enabled, name, pattern, temp, isBlackList) {
    this.enabled = arguments.length > 0 ? arguments[0] : true;
    this.name = name || "";
    this.pattern = pattern || "";
    this.temp = arguments.length > 3 ? arguments[3] : false;
    this.isBlackList = arguments.length > 4 ? arguments[4] : false;  
  },

  /**
   * Return true if ipStr matches (white/black; doesn't matter. enabled/disabled doesn't matter).
   * Return false otherwise.
   */
  match : function(ipStr) {
    if (this.pattern == "") return true;
    
    var pat = this.convert_addr(this.pattern);
    var mask = this.convert_addr(this.maskStr);
    var host = this.convert_add(ipStr);
    return ((ipStr & mask) == (pat & mask));
  }, 

  convert_addr : function(ipchars) {
    var bytes = ipchars.split('.');
    var result = ((bytes[0] & 0xff) << 24) |
                 ((bytes[1] & 0xff) << 16) |
                 ((bytes[2] & 0xff) <<  8) |
                  (bytes[3] & 0xff);
    return result;
  },  
  
  fromDOM : function(n) {
	  this.name = gGetSafeAttr(n, "name", "");
	  this.pattern = gGetSafeAttr(n, "pattern", "");
	  this.isBlackList = gGetSafeAttrB(n, "isBlackList", false);
	  this.enabled = gGetSafeAttrB(n, "enabled", true);
    // We don't deserialize this.temp because it's not serialized
  },

  toDOM : function(doc) {
    if (this.temp) return;
    var e = doc.createElement("ippattern");
    e.setAttribute("enabled", this.enabled);
    e.setAttribute("name", this.name);
    e.setAttribute("pattern", this.pattern);
    e.setAttribute("isBlackList", this.isBlackList);
    return e;
  }
};

var IPPatternFactory = {
  createInstance: function (aOuter, aIID) {
    if (aOuter != null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    return (new IPPattern()).QueryInterface(aIID);
  }
};

var IPPatternModule = {
  CLASS_ID : Components.ID("3d22848f-247b-483a-a58f-16ba7a93b7ed"),
  CLASS_NAME : "FoxyProxy IPPattern Component",
  CONTRACT_ID : "@leahscape.org/foxyproxy/ippattern;1",

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
      return IPPatternFactory;

    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};
