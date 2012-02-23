/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license, available in the LICENSE
  file at the root of this installation and also online at
  http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

// Manages the saving of original pref values on installation
// and their restoration when FoxyProxy is disabled/uninstalled through the EM.
// Also forces our values to remain in effect even if the user or
// another extension changes them. Restores values to original
// when FoxyProxy is in disabled mode.

//"use strict";

let CI = Components.interfaces, CC = Components.classes, CU = Components.utils,
  gObsSvc = CC["@mozilla.org/observer-service;1"].
    getService(CI.nsIObserverService),
   
  EXPORTED_SYMBOLS = ["defaultPrefs"];

var defaultPrefs = {
  FALSE : 0x10,
  TRUE : 0x11,    
  CLEARED : 0x12,
  origPrefetch : null,
  //network.dns.disablePrefetchFromHTTPS
  origDiskCache : true,
  origMemCache : true,
  origOfflineCache : true,
  origSSLCache : false,
  origCookieBehavior : 0,
  // We save this instance because we must call removeObserver method on the
  // same nsIPrefBranch2 instance on which we called addObserver method in order
  // to remove an observer.
  networkDNSPrefsObserver : null,
  cacheObserver : null, // see above comment
  networkCookieObserver : null, // see above comment
  beingUninstalled : false, /* flag per https://developer.mozilla.org/en/Code_snippets/Miscellaneous#Receiving_notification_before_an_extension_is_disabled_and.2for_uninstalled */
  fp : null,
  
  // Install observers
  init : function(fp) {
    CU.import("resource://foxyproxy/utils.jsm", this);
    this.fp = fp;
    this.addPrefsObservers();
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change",
              "em-action-requested", "quit-application"])
      gObsSvc.addObserver(this, i, false);
  },
  
  addPrefsObservers : function() {
    let that = this;
    function addPrefsObserver(obs, branch) {
      if (!obs) {
        obs = that.utils.getPrefsService(branch);
        obs.QueryInterface(CI.nsIPrefBranch2).addObserver("", that, false);
      }
    } 
    addPrefsObserver(this.networkDNSPrefsObserver, "network.dns.");
    addPrefsObserver(this.cacheObserver, "browser.cache.");
    addPrefsObserver(this.networkCookieObserver, "network.cookie.");
  },
  
  removePrefsObservers : function() {
    // we're not initialized and calling .removeObserver() will throw
    if (!this.networkDNSPrefsObservers)
      return;
    this.networkDNSPrefsObserver.removeObserver("", this);
    this.cacheObserver.removeObserver("", this);
    this.networkCookieObserver.removeObserver("", this);
    this.networkCookieObserver = this.cacheObserver =
      this.networkDNSPrefsObserver = null;
  },
  
  // Uninstall observers
  uninit : function() {
    this.removePrefsObservers();
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change",
      "em-action-requested", "quit-application"])
      gObsSvc.removeObserver(this, i);
  },

  observe : function(subj, topic, data) {
    let that = this;
    try {
      if (topic == "nsPref:changed" && data == "disablePrefetch") {
        if (this.shouldDisableDNSPrefetch())
          this.disablePrefetch();
        // Don't restore originals if shouldDisableDNSPrefetch == false -- let
        // the user do what he wants with the setting
      }
      else if (topic == "em-action-requested")
        this.restoreOnExit(data, subj.QueryInterface(CI.nsIUpdateItem));
      else if (topic == "quit-application" && this.beingUninstalled)
        this.restoreOriginals(false);
      else if (topic == "foxyproxy-mode-change") {
      	if (this.fp._mode == "disabled") {
          // We're being disabled.
      	  this.restoreOriginals(true);
      	  // Stop listening for pref changes
      	  this.removePrefsObservers();
      	  return;
      	}
      	if (this.fp._previousMode == "disabled") {
          // We're coming out of disabled mode
      	  this.saveOriginals();
        }
      	setOrUnsetPrefetch();
         // Start listening for pref changes if we aren't already
      	this.addPrefsObservers();
      }
      else if (topic == "foxyproxy-proxy-change") {
        if (this.fp._mode == "disabled") return;
        setOrUnsetPrefetch();
      }
    }
    catch (e) { this.utils.dumpp(e); }
    function setOrUnsetPrefetch() {
      if (that.shouldDisableDNSPrefetch())
        that.disablePrefetch();
      else
        that.restoreOriginalPreFetch(true);
    }
  },
  
  shouldDisableDNSPrefetch : function() {
    if (this.fp._mode=="disabled") return false;
    // Is mode "Use proxy xyz for all URLs". Does the selected proxy require dns prefetch disabling?
    if (this.fp._selectedProxy)
      return this.fp._selectedProxy.shouldDisableDNSPrefetch()
    // Mode is patterns, random, or roundrobin. If any of the proxies require
    // remote DNS lookup, disable the preference so we can manage it ourselves
    // as proxies are switched across URLs/IPs.
    return this.fp.proxies.requiresRemoteDNSLookups();
  },
  
  // FoxyProxy being disabled/uninstalled. Should we restore the original pre-FoxyProxy values?
  restoreOnExit : function(d, updateItem) {
    var guid = updateItem.id;
    if (guid == "foxyproxy-basic@eric.h.jung" || guid == "foxyproxy@eric.h.jung" || guid == "foxyproxyplus@leahscape.com") {
      if (d == "item-cancel-action")
        this.beingUninstalled = false;
      else if (d == "item-uninstalled" || d == "item-disabled")
        this.beingUninstalled = true;
      else if (d == "item-enabled")
        this.beingUninstalled = false;
    }
  },

  // Restore the original pre-FoxyProxy values.
  restoreOriginals : function(contObserving) {
    this.uninit(); // stop observing the prefs while we change them
    this.restoreOriginalBool("browser.cache.", "disk.enable", this.origDiskCache);
    this.restoreOriginalBool("browser.cache.", "memory.enable", this.origMemCache);
    this.restoreOriginalBool("browser.cache.", "offline.enable", this.origOfflineCache);
    this.restoreOriginalBool("browser.cache.", "disk_cache_ssl", this.origSSLCache);
    this.utils.getPrefsService("network.cookie.").setIntPref("cookieBehavior", this.origCookieBehavior);
    if (contObserving)
      this.init(this.fp); // Add our observers again
    this.restoreOriginalPreFetch(contObserving);
  },

  restoreOriginalBool : function(branch, pref, value) {
    let p = this.utils.getPrefsService(branch);
    if (value == this.TRUE)
      p.setBoolPref(pref, true);
    else if (value == this.FALSE)
      p.setBoolPref(pref, false);
    else if (value == this.CLEARED) {
      try {
        if (p.prefHasUserValue(pref))
          p.clearUserPref(pref);
      }
      catch (e) { /* i don't think this is necessary since p.prefHasUserValue() is called before clearing */
        this.utils.dumpp(e);
      }
    }
  },
  
  // Restore the original pre-FoxyProxy dnsPrefetch value and
  // optionally stop observing changes
  restoreOriginalPreFetch : function(contObserving) {
    let that = this;
    function forcePACReload() {
      // If Firefox is configured to use a PAC file, we need to force that PAC file to load.
      // Firefox won't load it automatically except on startup and after
      // network.proxy.autoconfig_retry_* seconds. Rather than make the user wait for that,
      // we load the PAC file now by flipping network.proxy.type (Firefox is observing that pref)
      var networkPrefs = that.utils.getPrefsService("network.proxy."), type;
      try {
        type = networkPrefs.getIntPref("type");
      }
      catch(e) {
        dump("FoxyProxy: network.proxy.type doesn't exist or can't be read\n");
        that.utils.dumpp(e);
      }
      if (type == 2) { /* isn't there a const for this? */ 
        // network.proxy.type is set to use a PAC file.    
        // Don't use nsPIProtocolProxyService to load the PAC. From its comments: "[nsPIProtocolProxyService] exists purely as a
        // hack to support the configureFromPAC method used by the preference panels in the various apps. Those
        // apps need to be taught to just use the preferences API to "reload" the PAC file. Then, at that point,
        // we can eliminate this interface completely."

        // var pacURL = networkPrefs.getCharPref("autoconfig_url");
        // var pps = CC["@mozilla.org/network/protocol-proxy-service;1"]
          // .getService(Components.interfaces.nsPIProtocolProxyService);
        // pps.configureFromPAC(pacURL);

        // Instead, change the prefs--the proxy service is observing and will reload the PAC
        networkPrefs.setIntPref("type", 1);
        networkPrefs.setIntPref("type", 2);
      }
    }

    this.uninit(); // stop observing the prefs while we change them
    this.restoreOriginalBool("network.dns.", "disablePrefetch", this.origPrefetch);
    forcePACReload();
    if (contObserving)
      this.init(this.fp); // Add our observers again
  },
  
  // Save the original prefs for restoring when FoxyProxy is disabled or
  // uninstalled.
  saveOriginals : function() {
    let p = this.utils.getPrefsService("network.dns.");
    this.origPrefetch = p.prefHasUserValue("disablePrefetch") ?
        (p.getBoolPref("disablePrefetch") ? this.TRUE : this.FALSE) : this.CLEARED;
    this.origDiskCache = this.utils.getPrefsService("browser.cache.").getBoolPref("disk.enable");
    this.origMemCache= this.utils.getPrefsService("browser.cache.").getBoolPref("memory.enable");
    this.origOfflineCache = this.utils.getPrefsService("browser.cache.").getBoolPref("offline.enable");
    this.origSSLCache = this.utils.getPrefsService("browser.cache.").getBoolPref("disk_cache_ssl");
    this.origCookieBehavior = this.utils.getPrefsService("network.cookie.").getIntPref("cookieBehavior");
    this.fp.writeSettingsAsync();
  },
  
  // Set our desired values for the prefs; may or may not be the same as the originals
  disablePrefetch : function() {
    this.uninit(); // stop observing the prefs while we change them
    this.utils.getPrefsService("network.dns.").setBoolPref("disablePrefetch", true);
    this.init(this.fp); // start observing the prefs again
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName("defaultPrefs").item(0);
    if (!n) return; // for pre-2.17 foxyproxy.xml files that don't have this node
    this.origPrefetch = this.utils.getSafeAttr(n, "origPrefetch", null);   // Default: does not exist   
    this.origDiskCache = this.utils.getSafeAttrB(n, "origDiskCache", true); // Default: true
    this.origMemCache = this.utils.getSafeAttrB(n, "origMemCache", true);    
    this.origOfflineCache = this.utils.getSafeAttrB(n, "origOfflineCache", true);
    this.origSSLCache = this.utils.getSafeAttrB(n, "origSSLCache", false); // Default: false
    this.origCookieBehavior = this.utils.getSafeAttr(n, "origCookieBehavior", 0); // Default: 0
  },
  
  toDOM : function(doc) {
    var e = doc.createElement("defaultPrefs");
    e.setAttribute("origPrefetch", this.origPrefetch);
    e.setAttribute("origDiskCache", this.origDiskCache);
    e.setAttribute("origMemCache", this.origMemCache);
    e.setAttribute("origOfflineCache", this.origOfflineCache);
    e.setAttribute("origSSLCache", this.origSSLCache);
    e.setAttribute("origCookieBehavior", this.origCookieBehavior);
    return e;
  }
};
