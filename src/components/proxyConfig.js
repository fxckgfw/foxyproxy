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

// TODO: move this to utils.jsm. I tried but ran into strange problems that will
// take a long time to debug.
var self, loader = CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI["mozIJSSubScriptLoader"]),  
  fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].getService(CI.nsIFileProtocolHandler);

if ("undefined" != typeof(__LOCATION__)) {
  // preferred way
  self = __LOCATION__;
}
else {
  self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
}
let rootDir = self.parent, // directory of this file
  loadComponentScript = function(filename) {
    try {
      let filePath = rootDir.clone();
      filePath.append(filename);
      loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
    }
    catch (e) {
      dump("Error loading component " + filename + ": " + e + "\n" + e.stack + "\n");
      throw(e);
    }
}
loadComponentScript("proxy.js"); // so we can reference DEFAULT_COLOR
/**
 * FoxyProxy Api - ProxyConfig
 */
function ProxyConfig() {
  this._id = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject.
    proxies.uniqueRandom();
};

ProxyConfig.prototype = {
  _id: -1, // Consumer cannot set this; only get it.
  name: "",
  notes: "",
  color: DEFAULT_COLOR, // same as DEFAULT_COLOR in proxy.js
  mode: "manual",
  enabled: true,
  selectedTabIndex: 1,
  animatedIcons: true,
  includeInCycle: true,
  clearCacheBeforeUse: false,
  disableCache: false,
  clearCookiesBeforeUse: false,
  rejectCookies: false,
  proxyDNS: true,
  get id() {
    return this._id;
  },
  manualConfig: {
    host: "",
    port: "",
    socks: false,
    socksVersion: 5,
  },
  autoConfig: {
    loadNotification: true,
    errorNotification: true,
    url: "",
    autoReload: false,
    reloadFrequencyMins: 60,
    disableOnBadPAC: true,
    mode: "pac",
  },
  classDescription: "FoxyProxy API ProxyConfig",
  contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
  classID: Components.ID("{c5a3caf1-d6bf-43be-8de6-e508ad02ca36}"), // uuid from IDL
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.foxyProxyProxyConfig]),
};
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4)
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 and earlier (Firefox 3.6)
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([ProxyConfig]);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule([ProxyConfig]);
