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

"use strict";

// Constants
let CC = Components.classes,
  CI = Components.interfaces,
  CU = Components.utils;

CU.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * FoxyProxy Api - Non-singleton ProxyConfig instances
 */
function ProxyConfig(wrappedProxy) {
  this._wrappedProxy = wrappedProxy || Proxy.fromProxyConfig(this);
  this.manualConfig.owner = this.autoConfig.owner = this;
  // We need this here to get a good default value for autoConfObj (i.e. the
  // PAC-AutoConf object)
  this.autoConfig.autoConfObj = this._wrappedProxy.autoconf;
  CU.import("resource://foxyproxy/utils.jsm", this);
};

ProxyConfig.prototype = {
  _wrappedProxy: null,

  // getter only for |id| -- no setter
  get id() {
    return this._wrappedProxy.id;
  },

  _name: "",

  get name() {
    return this._wrappedProxy.name;
  },

  set name(e) {
    // cannot change Default name
    if (!this._wrappedProxy.lastresort) {
      this._wrappedProxy.name = e;
      this.utils.broadcast(null, "foxyproxy-proxy-change");
    }
  },

  _notes: "",

  get notes() {
    return this._wrappedProxy.notes;
  },

  set notes(e) {
    // cannot change Default notes
    if (!this._wrappedProxy.lastresort) {
      this._wrappedProxy.notes = e;
      this.utils.broadcast(null, "foxyproxy-proxy-change");
    }
  },

  // same as DEFAULT_COLOR in proxy.js
  _color: "#0055E5",

  get color() {
    return this._wrappedProxy.color;
  },

  set color(e) {
    this._wrappedProxy.color = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _mode: "manual",

  get mode() {
    return this._wrappedProxy.mode;
  },

  set mode(e) {
    this._wrappedProxy.mode = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _enabled: true,

  get enabled() {
    return this._wrappedProxy.enabled;
  },

  set enabled(e) {
    // cannot disable Default
    if (!this._wrappedProxy.lastresort) {
      this._wrappedProxy.enabled = e;
      this.utils.broadcast(null, "foxyproxy-proxy-change");
    }
  },

  _selectedTabIndex: 1,

  get selectedTabIndex() {
    return this._wrappedProxy.selectedTabIndex;
  },

  set selectedTabIndex(e) {
    this._wrappedProxy.selectedTabIndex = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _animatedIcons: true,

  get animatedIcons() {
    return this._wrappedProxy.animatedIcons;
  },

  set animatedIcons(e) {
    this._wrappedProxy.animatedIcons = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _includeInCycle: true,

  get includeInCycle() {
    return this._wrappedProxy.animatedIcons;
  },

  set includeInCycle(e) {
   this._wrappedProxy.includeInCycle = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _clearCacheBeforeUse: false,

  get clearCacheBeforeUse() {
    return this._wrappedProxy.clearCacheBeforeUse;
  },

  set clearCacheBeforeUse(e) {
    this._wrappedProxy.clearCacheBeforeUse = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _disableCache: false,

  get disableCache() {
    return this._wrappedProxy.disableCache;
  },

  set disableCache(e) {
    this._wrappedProxy.disableCache = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _clearCookiesBeforeUse: false,

  get clearCookiesBeforeUse() {
    return this._wrappedProxy.clearCookiesBeforeUse;
  },

  set clearCookiesBeforeUse(e) {
    this._wrappedProxy.clearCookiesBeforeUse = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _rejectCookies: false,

  get rejectCookies() {
    return this._wrappedProxy.rejectCookies;
  },

  set rejectCookies(e) {
    this._wrappedProxy.rejectCookies = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  _proxyDNS: true,

  get proxyDNS() {
    return this._wrappedProxy.proxyDNS;
  },

  set proxyDNS(e) {
    this._wrappedProxy.proxyDNS = e;
    this.utils.broadcast(null, "foxyproxy-proxy-change");
  },

  manualConfig: {
    owner: null,
    _host: "",

    get host() {
      return this.owner._wrappedProxy.manualconf.host;
    },

    set host(e) {
      this.owner._wrappedProxy.manualconf.host = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _port: "",

    get port() {
      return this.owner._wrappedProxy.manualconf.port;
    },

    set port(e) {
      this.owner._wrappedProxy.manualconf.port = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _socks: false,

    get socks() {
      return this.owner._wrappedProxy.manualconf.isSocks;
    },

    set socks(e) {
      this.owner._wrappedProxy.manualconf.isSocks = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _socksVersion: 5,

    get socksversion() {
      return this.owner._wrappedProxy.manualconf.socksversion;
    },

    set socksversion(e) {
      this.owner._wrappedProxy.manualconf.socksversion = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    }
  },

  autoConfig: {
    owner: null,
    autoConfObj: null,
    _loadNotification: true,

    get loadNotification() {
      return this.autoConfObj.loadNotification;
    },

    set loadNotification(e) {
      this.autoConfObj.loadNotification = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _errorNotification: true,

    get errorNotification() {
      return this.autoConfObj.errorNotification;
    },

    set errorNotification(e) {
      this.autoConfObj.errorNotification = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _url: "",

    get url() {
      return this.autoConfObj.url;
    },

    set url(e) {
      this.autoConfObj.url = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _autoReload: false,

    get autoReload() {
      return this.autoConfObj.autoReload;
    },

    set autoReload(e) {
      this.autoConfObj.autoReload = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _reloadFrequencyMins: 60,

    get reloadFrequencyMins() {
      return this.autoConfObj.reloadFreqMins;
    },

    set reloadFrequencyMins(e) {
      this.autoConfObj.reloadFreqMins = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _disableOnBadPAC: true,

    get disableOnBadPAC() {
      return this.autoConfObj.disableOnBadPAC;
    },

    set disableOnBadPAC(e) {
      this.autoConfObj.disableOnBadPAC = e;
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    },

    _mode: "pac",

    get mode() {
      return this.owner._wrappedProxy.autoconfMode;
    },

    set mode(e) {
      this.owner._wrappedProxy.autoconfMode = e;
      // Should the PAC object or the WPAD object get changed?
      if (e === "pac") {
        // The webdev wants to change the PAC object...
        this.autoConfObj = this.owner._wrappedProxy.autoconf;
      } else if (e === "wpad") {
        // The webdev wants to change the WPAD object...
        this.autoConfObj = this.owner._wrappedProxy.wpad;
      } else {
        // Wrong mode. Setting autoConfObj to null to avoid overwriting existing
        // values (accidentally).
        this.autoConfObj = null;
      }
      this.owner.utils.broadcast(null, "foxyproxy-proxy-change");
    }
  },

  // nsIClassInfo
  /*
    Gecko 2.x only (doesn't work with Firefox 3.6.x)
      classInfo: generateCI({ interfaces: ["foxyProxyConfig"], classID: Components.ID("{c5a3caf1-d6bf-43be-8de6-e508ad02ca36}"),
      contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
      classDescription: "FoxyProxy API ProxyConfig", flags: CI.nsIClassInfo.DOM_OBJECT}),
  */

  flags: CI.nsIClassInfo.DOM_OBJECT,
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  getHelperForLanguage: function(l) null,
  getInterfaces: function(count) {
    let interfaces = [CI.foxyProxyConfig];
    count.value = interfaces.length;
    return interfaces;
  },

  classDescription: "FoxyProxy API ProxyConfig",
  contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
  // uuid from IDL
  classID: Components.ID("{c5a3caf1-d6bf-43be-8de6-e508ad02ca36}"),
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.foxyProxyConfig,
    CI.nsIClassInfo]),
};
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4)
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 and earlier (Firefox 3.6)
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([ProxyConfig]);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule([ProxyConfig]);
