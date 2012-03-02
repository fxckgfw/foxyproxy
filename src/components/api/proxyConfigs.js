/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

/* This class exists because we do not want to expose proxy.js (Proxy class)
   directly to web content. That is because such consumers could access
   the .wrappedJSObject property on new Proxy objects and really destroy
   a FoxyProxy configuration. So, we have this value object (a.k.a. data
   transfer object) which they manipulate. It's just a container of
   data/properties, no code.
*/

// Constants
var CC = Components.classes,
  CI = Components.interfaces,
  CU = Components.utils,
  CR = Components.results;

CU.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * FoxyProxy Api - Singleton container and manager of ProxyConfig instances
 */
function ProxyConfigs() {
  this.fp = CC["@leahscape.org/foxyproxy/service;1"].getService().
    wrappedJSObject;
  CU.import("resource://foxyproxy/utils.jsm", this);
  this.utils.loadComponentScript("api/proxyConfig.js", this);
};

ProxyConfigs.prototype = {
  fp: null,

  // Create and return a new ProxyConfig with smart defaults.
  // Use |addProxyConfig()| to add it to the current list of proxies.
  createProxyConfig : function() {
    // We could create a new ProxyConfig using XPCOM, but this is faster.
    return new this.ProxyConfig(CC["@leahscape.org/foxyproxy/proxy;1"].
      createInstance().wrappedJSObject);
  },

  // Add and return the specified ProxyConfig. If |index| is not specified,
  // its added to the top/front of the list; otherwise, at the specified zero-
  // based index. An "empty" ProxyConfig can be created using
  // |createProxyConfig()|. Manipulate its properties, then call this function
  // to add it to the list of ProxyConfigs.
  addProxyConfig : function(pc, idx) {
    // Convert ProxyConfig object to a Proxy object
    let  p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance()
      .wrappedJSObject;
    p.fromProxyConfig(pc);
    this.fp.proxies.insertAt(idx, p);
    this.fp.broadcast(null, "foxyproxy-proxy-change"); // TODO: move this into insertAt()
    return pc;    
  },

  get length() {
    return this.fp.proxies.length;
  },

  getAll : function() {
    let ret = [];
    // Convert proxy objects to ProxyConfig objects
    for (let i=0, len=this.fp.proxies.length; i<len; i++) {
      let p = this.fp.proxies.item(i);
      ret.push(new this.ProxyConfig(p));
    }
    return ret;
  },

  getById : function(id) {
    return new this.ProxyConfig(this.fp.proxies.getProxyById(id));
  },

  getByName : function(name) {
  },

  getByIndex : function(idx) {
    return new this.ProxyConfig(this.fp.proxies.item(idx));
  },

  deleteById : function(id) {
  },

  // nsIClassInfo
  /*
    Gecko 2.x only (doesn't work with Firefox 3.6.x)
      classInfo: generateCI({ interfaces: ["foxyProxyConfigs"], classID: Components.ID("{40c327cd-c8d4-4753-9441-6c60fe6ea461}"),
      contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
      classDescription: "FoxyProxy API ProxyConfig", flags: CI.nsIClassInfo.SINGLETON|CI.nsIClassInfo.DOM_OBJECT}),
  */

  flags: CI.nsIClassInfo.SINGLETON|CI.nsIClassInfo.DOM_OBJECT,
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  getHelperForLanguage: function(l) null,
  getInterfaces: function(count) {
    let interfaces = [CI.foxyProxyConfigs];
    count.value = interfaces.length;
    return interfaces;
  },

  classDescription: "FoxyProxy API ProxyConfigs",
  contractID: "@leahscape.org/foxyproxy/proxyconfigs;1",
  classID: Components.ID("{40c327cd-c8d4-4753-9441-6c60fe6ea461}"), // uuid from IDL
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.foxyProxyConfigs, CI.nsIClassInfo]),
};
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4)
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 and earlier (Firefox 3.6)
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([ProxyConfigs]);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule([ProxyConfigs]);
