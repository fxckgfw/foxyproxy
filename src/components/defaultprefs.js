// Manages the saving of original pref values on installation
// and their restoration when FoxyProxy is disabled/uninstalled through the EM.
// Also forces our values to remain in effect even if the user or
// another extension changes them. Restores values to original
// when FoxyProxy is in disabled mode.
var defaultPrefs = {
  FALSE : 0x10,
  TRUE : 0x11,    
  CLEARED : 0x12,
  origPrefetch : null,
  //network.dns.disablePrefetchFromHTTPS
  origDiskCache : null,
  origMemCache : null,
  origOfflineCache : null,
  origSSLCache : null,
  networkPrefsObserver : null, /* We save this instance because we must call removeObserver method on the same nsIPrefBranch2 instance on which we called addObserver method in order to remove an observer */
  diskCacheObserver : null, // see above comment
  memCacheObserver : null, // see above comment
  offlineCacheObserver : null, // see above comment
  beingUninstalled : false, /* flag per https://developer.mozilla.org/en/Code_snippets/Miscellaneous#Receiving_notification_before_an_extension_is_disabled_and.2for_uninstalled */
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver]),
  fp : null,
  
  // Install observers
  init : function(fp) {
    this.fp = fp;
    this.addPrefsObserver();
    for each (let i in ["foxyproxy-mode-change", "foxyproxy-proxy-change", "em-action-requested",
        "quit-application"])
      gObsSvc.addObserver(this, i, false);
  },
  
  addPrefsObserver : function() {
    if (!this.networkPrefsObserver) {
      this.networkPrefsObserver = this.fp.getPrefsService("network.dns.");
      this.networkPrefsObserver.QueryInterface(CI.nsIPrefBranch2).addObserver("", this, false);        
    }
    if (!this.diskCacheObserver) {
      this.diskCacheObserver = this.fp.getPrefsService("browser.cache.disk.");
      this.diskCacheObserver.QueryInterface(CI.nsIPrefBranch2).addObserver("", this, false);        
    }
    if (!this.memCacheObserver) {
      this.memCacheObserver = this.fp.getPrefsService("browser.cache.memory.");
      this.memCacheObserver.QueryInterface(CI.nsIPrefBranch2).addObserver("", this, false);        
    }
    if (!this.offlineCacheObserver) {
      this.offlineCacheObserver = this.fp.getPrefsService("browser.offline.");
      this.offlineCacheObserver.QueryInterface(CI.nsIPrefBranch2).addObserver("", this, false);        
    }
  },
  
  removePrefsObservers : function() {
    if (!this.networkPrefsObservers) // we're not initialized and calling gObsSvc.removeObserver() will throw
      return;
    this.networkPrefsObserver.removeObserver("", this);
    this.diskCacheObserver.removeObserver("", this);
    this.memCacheObserver.removeObserver("", this);
    this.offlineCacheObserver.removeObserver("", this);
    this.offlineCacheObserver = this.memCacheObserver = this.diskCacheObserver =
      this.networkPrefsObserver = null;
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
        if (this.shouldDisableDNSPrefetch())
          this.disablePrefetch();
        if (this.shouldDisableCaching())
          this.clearAndDisableCaching();
        // Don't restore originals if shouldDisableDNSPrefetch == false -- let the user do what he wants with the setting
      }
      else if (topic == "em-action-requested")
        this.restoreOnExit(data, subj.QueryInterface(CI.nsIUpdateItem));
      else if (topic == "quit-application" && this.beingUninstalled)
        this.restoreOriginals(false);
      else if (topic == "foxyproxy-mode-change") {
      	if (this.fp._mode=="disabled") { // We're being disabled.
      	  this.restoreOriginals(true);
      	  // Stop listening for pref changes
      	  this.removePrefsObservers();
      	  return;
      	}
      	if (this.fp._previousMode=="disabled") // We're coming out of disabled mode
      	  this.saveOriginals();
      	setOrUnsetPrefetch(this);
      	this.addPrefsObserver(); // Start listening for pref changes if we aren't already
      }
      else if (topic == "foxyproxy-proxy-change") {
        if (this.fp._mode=="disabled") return;
        setOrUnsetPrefetch(this);
      }
    }
    catch (e) { dumpp(e); }
    function setOrUnsetPrefetch(self) {
      if (self.shouldDisableDNSPrefetch())
        self.disablePrefetch();
      else
        self.restoreOriginals(true);
    }
  },
  
  shouldDisableDNSPrefetch : function() {
    if (this.fp._mode=="disabled") return false;
    // Is mode "Use proxy xyz for all URLs". Does the selected proxy require dns prefetch disabling?
    if (this.fp._selectedProxy)
      return this.fp._selectedProxy.shouldDisableDNSPrefetch()
    // Mode is patterns, random, or roundrobin
    return this.fp.proxies.requiresRemoteDNSLookups();
  },

  shouldDisableCaching : function() {
    if (this.fp._mode=="disabled") return false;
    // Is mode "Use proxy xyz for all URLs". Does the selected proxy require cache disabling?
    if (this.fp._selectedProxy)
      return this.fp._selectedProxy.disableCaching;
    // Mode is patterns, random, or roundrobin
    return this.fp.proxies.disableCaching;
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

    function restoreOriginal(branch, pref, value) {
      let p = this.fp.getPrefsService(branch);
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
          dumpp(e);
        }
      }
    }
    function forcePACReload() {
      // If Firefox is configured to use a PAC file, we need to force that PAC file to load.
      // Firefox won't load it automatically except on startup and after
      // network.proxy.autoconfig_retry_* seconds. Rather than make the user wait for that,
      // we load the PAC file now by flipping network.proxy.type (Firefox is observing that pref)
      var networkPrefs = this.fp.getPrefsService("network.proxy."), type;
      try {
        type = networkPrefs.getIntPref("type");
      }
      catch(e) {
        dump("FoxyProxy: network.proxy.type doesn't exist or can't be read\n");
        dumpp(e);
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
    restoreOriginal("network.dns.", "disablePrefetch", this.origPrefetch);
    forcePACReload();
    restoreOriginal("browser.cache.disk.", "enable", this.origDiskCache);
    restoreOriginal("browser.cache.memory.", "enable", this.origMemCache);
    restoreOriginal("browser.offline.", "enable", this.origOfflineCache);
    restoreOriginal("browser.cache.disk_cache_ssl.", "disablePrefetch", this.origSSLCache);
    if (contObserving)
      this.init(); // Add our observers again
  },
  
  // Save the original prefs for restoring when FoxyProxy is disabled/uninstalled
  saveOriginals : function() {
    var p = this.fp.getPrefsService("network.dns.");
    this.origPrefetch = p.prefHasUserValue("disablePrefetch") ?
        (p.getBoolPref("disablePrefetch") ? this.TRUE : this.FALSE) : this.CLEARED;
    this.fp.writeSettingsAsync();
  },
  
  // Set our desired values for the prefs; may or may not be the same as the originals
  disablePrefetch : function() {
    this.uninit(); // stop observing the prefs while we change them
    this.fp.getPrefsService("network.dns.").setBoolPref("disablePrefetch", true);
    this.init(); // start observing the prefs again
  },

  clearAndDisableCaching : function() {
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName("defaultPrefs").item(0);
    if (!n) return; // for pre-2.17 foxyproxy.xml files that don't have this node
    this.origPrefetch = gGetSafeAttr(n, "origPrefetch", null);      
    this.origDiskCache = gGetSafeAttr(n, "origDiskCache", null);
    this.origMemCache = gGetSafeAttr(n, "origMemCache", null);    
    this.origOfflineCache = gGetSafeAttr(n, "origOfflineCache", null);
    this.origSSLCache = gGetSafeAttr(n, "origSSLCache", null); 
  },
  
  toDOM : function(doc) {
    var e = doc.createElement("defaultPrefs");
    e.setAttribute("origPrefetch", this.origPrefetch);
    e.setAttribute("origDiskCache", this.origDiskCache);
    e.setAttribute("origMemCache", this.origMemCache);
    e.setAttribute("origOfflineCache", this.origOfflineCache);
    e.setAttribute("origSSLCache", this.origSSLCache);
    return e;
  }
};
