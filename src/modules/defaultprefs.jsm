// Manages the saving of original pref values on installation
// and their restoration when FoxyProxy is disabled/uninstalled through the EM.
// Also forces our values to remain in effect even if the user or
// another extension changes them. Restores values to original
// when FoxyProxy is in disabled mode.
var CI = Components.interfaces, CC = Components.classes, CU = Components.utils,
  gObsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService),
  EXPORTED_SYMBOLS = ["defaultPrefs"];

CU.import("resource://gre/modules/XPCOMUtils.jsm");
CU.import("resource://foxyproxy/utils.jsm");
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
  networkDNSPrefsObserver : null, /* We save this instance because we must call removeObserver method on the same nsIPrefBranch2 instance on which we called addObserver method in order to remove an observer */
  diskCacheObserver : null, // see above comment
  memCacheObserver : null, // see above comment
  offlineCacheObserver : null, // see above comment
  networkCookieObserver : null, // see above comment
  sslCacheObserver : null, // see above comment
  beingUninstalled : false, /* flag per https://developer.mozilla.org/en/Code_snippets/Miscellaneous#Receiving_notification_before_an_extension_is_disabled_and.2for_uninstalled */
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver]),
  fp : null,
  
  // Install observers
  init : function(fp) {
    defaultPrefs.fp = fp;
    defaultPrefs.addPrefsObservers();
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change", "em-action-requested",
        "quit-application"])
      gObsSvc.addObserver(defaultPrefs, i, false);
  },
  
  addPrefsObservers : function() {
    function addPrefsObserver(obs, branch) {
      if (!obs) {
        obs = utils.getPrefsService(branch);
        obs.QueryInterface(CI.nsIPrefBranch2).addObserver("", defaultPrefs, false);        
      }
    } 
    addPrefsObserver(this.networkDNSPrefsObserver, "network.dns.");
    addPrefsObserver(this.diskCacheObserver, "browser.cache.disk.");
    addPrefsObserver(this.memCacheObserver, "browser.cache.memory");
    addPrefsObserver(this.offlineCacheObserver, "browser.offline.");
    addPrefsObserver(this.sslCacheObserver, "browser.cache.disk_cache_ssl.");
    addPrefsObserver(this.networkCookieObserver, "network.cookie.");  
  },
  
  removePrefsObservers : function() {
    if (!this.networkDNSPrefsObservers) // we're not initialized and calling .removeObserver() will throw
      return;
    this.networkDNSPrefsObserver.removeObserver("", this);
    this.diskCacheObserver.removeObserver("", this);
    this.memCacheObserver.removeObserver("", this);
    this.offlineCacheObserver.removeObserver("", this);
    this.offlineCacheObserver.removeObserver("", this);
    this.sslCacheObserver.removeObserver("", this);
    this.networkCookieObserver = this.sslCacheObserver = this.offlineCacheObserver =
      this.memCacheObserver = this.diskCacheObserver = this.networkDNSPrefsObserver = null;
  },
  
  // Uninstall observers
  uninit : function() {
    this.removePrefsObservers();
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change", "em-action-requested",
        "quit-application"])
      gObsSvc.removeObserver(this, i);
  },

  observe : function(subj, topic, data) {
    try {
      if (topic == "nsPref:changed" && data == "disablePrefetch") {
        if (defaultPrefs.shouldDisableDNSPrefetch())
          defaultPrefs.disablePrefetch();
        // Don't restore originals if shouldDisableDNSPrefetch == false -- let the user do what he wants with the setting
      }
      else if (topic == "em-action-requested")
        defaultPrefs.restoreOnExit(data, subj.QueryInterface(CI.nsIUpdateItem));
      else if (topic == "quit-application" && this.beingUninstalled)
        defaultPrefs.restoreOriginals(false);
      else if (topic == "foxyproxy-mode-change") {
      	if (defaultPrefs.fp._mode=="disabled") { // We're being disabled.
      	  defaultPrefs.restoreOriginals(true);
      	  // Stop listening for pref changes
      	  defaultPrefs.removePrefsObservers();
      	  return;
      	}
      	if (defaultPrefs.fp._previousMode=="disabled") // We're coming out of disabled mode
      	  defaultPrefs.saveOriginals();
      	setOrUnsetPrefetch();
      	defaultPrefs.addPrefsObservers(); // Start listening for pref changes if we aren't already
      }
      else if (topic == "foxyproxy-proxy-change") {
        if (defaultPrefs.fp._mode=="disabled") return;
        setOrUnsetPrefetch();
      }
    }
    catch (e) { utils.dumpp(e); }
    function setOrUnsetPrefetch() {
      if (defaultPrefs.shouldDisableDNSPrefetch())
        defaultPrefs.disablePrefetch();
      else
        defaultPrefs.restoreOriginals(true);
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
  
  // Restore the original pre-FoxyProxy values and stop observing changes
  restoreOriginals : function(contObserving) {

    function restoreOriginalBool(branch, pref, value) {
      let p = utils.getPrefsService(branch);
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
          utils.dumpp(e);
        }
      }
    }
    function forcePACReload() {
      // If Firefox is configured to use a PAC file, we need to force that PAC file to load.
      // Firefox won't load it automatically except on startup and after
      // network.proxy.autoconfig_retry_* seconds. Rather than make the user wait for that,
      // we load the PAC file now by flipping network.proxy.type (Firefox is observing that pref)
      var networkPrefs = utils.getPrefsService("network.proxy."), type;
      try {
        type = networkPrefs.getIntPref("type");
      }
      catch(e) {
        dump("FoxyProxy: network.proxy.type doesn't exist or can't be read\n");
        utils.dumpp(e);
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
    restoreOriginalBool("network.dns.", "disablePrefetch", this.origPrefetch);
    forcePACReload();
    restoreOriginalBool("browser.cache.disk.", "enable", this.origDiskCache);
    restoreOriginalBool("browser.cache.memory.", "enable", this.origMemCache);
    restoreOriginalBool("browser.offline.", "enable", this.origOfflineCache);
    restoreOriginalBool("browser.cache.disk_cache_ssl.", "enable", this.origSSLCache);
    utils.getPrefsService("network.cookie.").setIntPref("cookieBehavior", this.origCookieBehavior);
    if (contObserving)
      this.init(this.fp); // Add our observers again
  },
  
  // Save the original prefs for restoring when FoxyProxy is disabled/uninstalled
  saveOriginals : function() {
    let p = utils.getPrefsService("network.dns.");
    this.origPrefetch = p.prefHasUserValue("disablePrefetch") ?
        (p.getBoolPref("disablePrefetch") ? this.TRUE : this.FALSE) : this.CLEARED;
    this.origDiskCache = utils.getPrefsService("browser.cache.disk.").getBoolPref("enable");
    this.origMemCache= utils.getPrefsService("browser.cache.memory.").getBoolPref("enable");
    this.origOfflineCache = utils.getPrefsService("browser.offline.").getBoolPref("enable");
    this.origSSLCache = utils.getPrefsService("browser.cache.disk_cache_ssl.").getBoolPref("enable");
    this.origCookieBehavior = utils.getPrefsService("network.cookie.").getIntPref("cookieBehavior");
    this.fp.writeSettingsAsync();
  },
  
  // Set our desired values for the prefs; may or may not be the same as the originals
  disablePrefetch : function() {
    this.uninit(); // stop observing the prefs while we change them
    this.utils.("network.dns.").setBoolPref("disablePrefetch", true);
    this.init(this.fp); // start observing the prefs again
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName("defaultPrefs").item(0);
    if (!n) return; // for pre-2.17 foxyproxy.xml files that don't have this node
    this.origPrefetch = utils.getSafeAttr(n, "origPrefetch", null);   // Default: does not exist   
    this.origDiskCache = utils.getSafeAttrB(n, "origDiskCache", true); // Default: true
    this.origMemCache = utils.getSafeAttrB(n, "origMemCache", true);    
    this.origOfflineCache = utils.getSafeAttrB(n, "origOfflineCache", true);
    this.origSSLCache = utils.getSafeAttrB(n, "origSSLCache", false); // Default: false
    this.origCookieBehavior = utils.getSafeAttr(n, "origCookieBehavior", 0); // Default: 0
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
