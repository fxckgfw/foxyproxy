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

"use strict";

let CI = Components.interfaces, CC = Components.classes, CU = Components.utils,
  gObsSvc = CC["@mozilla.org/observer-service;1"].
    getService(CI.nsIObserverService),
   
  EXPORTED_SYMBOLS = ["defaultPrefs"];

let defaultPrefs = {
  FALSE : 0x10,
  TRUE : 0x11,    
  CLEARED : 0x12,
  // These values are just reasonable defaults. The user-specific original
  // values will be read in saveOriginals().
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
    this.addGeneralObservers();
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

  addGeneralObservers : function() {
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change",
              "em-action-requested", "quit-application"])
      gObsSvc.addObserver(this, i, false);
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

  removeGeneralObservers : function() {
    // Getting the exception in case we already removed these observers
    try {
      for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change",
                "em-action-requested", "quit-application"])
        gObsSvc.removeObserver(this, i);
    } catch(e) {} 
  },
  
  // Uninstall observers
  uninit : function() {
    this.removePrefsObservers();
    this.removeGeneralObservers();
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
      else if (topic == "quit-application") {
        // We do not need to remove our observers here if the if-branch is
        // taken as all observers are removed by calling restoreOriginals()
        // with "false" as parameter.
        if (this.beingUninstalled) {
          this.restoreOriginals("all", false);
        } else {
          // Removing all of our observers on shutdown 
          this.uninit();
          // Save the original values just in case a user changed them while
          // FoxyProxy being active.
          this.saveOriginals();
        }
      }
      else if (topic == "foxyproxy-mode-change") {
        if (this.fp._mode == "disabled") {
          // We need to reset this value in order to not miss changes while
          // disabling FoxyProxy and enabling the same proxy again.
          this.fp.cacheAndCookiesChecked = false;
          // We're being disabled. But we still want to have our general
          // observers.
          this.restoreOriginals("all", true);
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
    if (this.fp._mode == "disabled") return false;
    // Is mode "Use proxy xyz for all URLs"? Does the selected proxy require dns
    // prefetch disabling?
    if (this.fp._selectedProxy)
      return this.fp._selectedProxy.shouldDisableDNSPrefetch()
    // Mode is patterns, random, or roundrobin. If any of the proxies require
    // remote DNS lookup, disable the preference so we can manage it ourselves
    // as proxies are switched across URLs/IPs.
    return this.fp.proxies.requiresRemoteDNSLookups();
  },

  // Set our desired values for the prefs; may or may not be the same as the
  // originals
  disablePrefetch : function() {
    // stop observing the prefs while we change them
    this.removePrefsObservers();
    this.utils.getPrefsService("network.dns.").setBoolPref("disablePrefetch",
      true);
    // start observing the prefs again
    this.addPrefsObservers();
  },
  
  // FoxyProxy being disabled/uninstalled. Should we restore the original
  // pre-FoxyProxy values?
  restoreOnExit : function(d, updateItem) {
    let guid = updateItem.id;
    if (guid == "foxyproxy-basic@eric.h.jung" || guid ==
        "foxyproxy@eric.h.jung" || guid == "foxyproxyplus@leahscape.com") {
      if (d == "item-cancel-action")
        this.beingUninstalled = false;
      else if (d == "item-uninstalled" || d == "item-disabled")
        this.beingUninstalled = true;
      else if (d == "item-enabled")
        this.beingUninstalled = false;
    }
  },

  // Restore the original pre-FoxyProxy values.
  // |type| can be "cache", "cookies", or "all"
  restoreOriginals : function(type, contObserving) {
    if (type === "cache" || type === "all") {
      this.utils.getPrefsService("browser.cache.").setBoolPref("disk.enable",
        this.origDiskCache);
      this.utils.getPrefsService("browser.cache.").setBoolPref("memory.enable",
        this.origMemCache);
      this.utils.getPrefsService("browser.cache.").setBoolPref("offline.enable",
        this.origOfflineCache);
      this.utils.getPrefsService("browser.cache.").setBoolPref("disk_cache_ssl",
        this.origSSLCache);
    }
    if (type === "cookies" || type === "all") {
      this.utils.getPrefsService("network.cookie.").setIntPref("cookieBehavior",
        this.origCookieBehavior);
    }
    if (type === "all") {
      this.restoreOriginalPreFetch(contObserving);
    }
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
      catch (e) {
        // I don't think this is necessary since p.prefHasUserValue() is called
        // before clearing
        this.utils.dumpp(e);
      }
    }
  },
  
  // Restore the original pre-FoxyProxy dnsPrefetch value and
  // optionally stop observing changes
  restoreOriginalPreFetch : function(contObserving) {
    let that = this;
    function forcePACReload() {
      // If Firefox is configured to use a PAC file, we need to force that PAC
      // file to load. Firefox won't load it automatically except on startup
      // and after network.proxy.autoconfig_retry_* seconds. Rather than make
      // the user wait for that, we load the PAC file now by flipping
      // network.proxy.type (Firefox is observing that pref)
      let networkPrefs = that.utils.getPrefsService("network.proxy."), type;
      try {
        type = networkPrefs.getIntPref("type");
      }
      catch(e) {
        dump("FoxyProxy: network.proxy.type doesn't exist or can't be read\n");
        that.utils.dumpp(e);
      }
      // Isn't there a const for this?
      if (type == 2) {
        // network.proxy.type is set to use a PAC file. Don't use
        // nsPIProtocolProxyService to load the PAC. From its comments:
        // "[nsPIProtocolProxyService] exists purely as a hack to support the
        // configureFromPAC method used by the preference panels in the various
        // apps. Those apps need to be taught to just use the preferences API
        // to "reload" the PAC file. Then, at that point, we can eliminate this
        // interface completely."

        // var pacURL = networkPrefs.getCharPref("autoconfig_url");
        // var pps = CC["@mozilla.org/network/protocol-proxy-service;1"]
        // .getService(Components.interfaces.nsPIProtocolProxyService);
        // pps.configureFromPAC(pacURL);

        // Instead, change the prefs--the proxy service is observing and will
        // reload the PAC.
        networkPrefs.setIntPref("type", 1);
        networkPrefs.setIntPref("type", 2);
      }
    }

    // Stop observing the prefs while we change disablePrefetch.
    this.removePrefsObservers();
    this.restoreOriginalBool("network.dns.", "disablePrefetch",
      this.origPrefetch);
    forcePACReload();
    if (!contObserving)
      this.removeGeneralObservers();
  },
  
  // Save the original prefs for restoring when FoxyProxy is disabled or
  // uninstalled or restarted.
  saveOriginals : function() {
    let p = this.utils.getPrefsService("network.dns.");
    this.origPrefetch = p.prefHasUserValue("disablePrefetch") ?
      (p.getBoolPref("disablePrefetch") ? this.TRUE : this.FALSE) :
      this.CLEARED;
    this.origDiskCache = this.utils.getPrefsService("browser.cache.").
      getBoolPref("disk.enable");
    this.origMemCache= this.utils.getPrefsService("browser.cache.").
      getBoolPref("memory.enable");
    this.origOfflineCache = this.utils.getPrefsService("browser.cache.").
      getBoolPref("offline.enable");
    this.origSSLCache = this.utils.getPrefsService("browser.cache.").
      getBoolPref("disk_cache_ssl");
    this.origCookieBehavior = this.utils.getPrefsService("network.cookie.").
      getIntPref("cookieBehavior");
    this.fp.writeSettingsAsync();
  },
  
  fromDOM : function(doc) {
    let n = doc.getElementsByTagName("defaultPrefs").item(0);
    // for pre-2.17 foxyproxy.xml files that don't have this node
    if (!n) return;
    // Default: does not exist
    this.origPrefetch = this.utils.getSafeAttr(n, "origPrefetch", null);
    if (n.QueryInterface(CI.nsIDOMElement).hasAttribute("origDiskCache")) {
      // The values are already saved, just load them.
      this.origDiskCache = n.getAttribute("origDiskCache");
      this.origMemCache = n.getAttribute("origMemCache");
      this.origOfflineCache = n.getAttribute("origOfflineCache");
      this.origSSLCache = n.getAttribute("origSSLCache");
      this.origCookieBehavior = n.getAttribute("origCookieBehavior");
    } else {
      // The original values are not saved yet. Maybe we upgraded or FoxyProxy
      // just got installed.
      let prefs = this.utils.getPrefsService("");
      this.origDiskCache = prefs.getBoolPref("browser.cache.disk.enable");
      this.origMemCache = prefs.getBoolPref("browser.cache.memory.enable");
      this.origOfflineCache = prefs.getBoolPref("browser.cache.offline.enable");
      this.origSSLCache = prefs.getBoolPref("browser.cache.disk_cache_ssl");
      this.origCookieBehavior = prefs.
        getIntPref("network.cookie.cookieBehavior");
    }
  },
  
  toDOM : function(doc) {
    let e = doc.createElement("defaultPrefs");
    e.setAttribute("origPrefetch", this.origPrefetch);
    e.setAttribute("origDiskCache", this.origDiskCache);
    e.setAttribute("origMemCache", this.origMemCache);
    e.setAttribute("origOfflineCache", this.origOfflineCache);
    e.setAttribute("origSSLCache", this.origSSLCache);
    e.setAttribute("origCookieBehavior", this.origCookieBehavior);
    return e;
  }
};
