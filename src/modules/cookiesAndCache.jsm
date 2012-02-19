/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license, available in the LICENSE
  file at the root of this installation and also online at
  http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

"use strict";

var CI = Components.interfaces, CC = Components.classes, CU = Components.utils,
  cachService = CC["@mozilla.org/network/cache-service;1"].getService(CI.nsICacheService),
  cookieService = CC["@mozilla.org/cookiemanager;1"].getService(CI.nsICookieManager);

CU.import("resource://foxyproxy/utils.jsm");

var cookiePrefs = utils.getPrefsService("network.cookie."),
  networkHttpPrefs = utils.getPrefsService("network.http."),
  diskCachePrefs = utils.getPrefsService("browser.cache.disk."),
  memCachPrefs = utils.getPrefsService("browser.cache.memory."),
  offlineCachePrefs = utils.getPrefsService("browser.offline."),
  sslCachePrefs = utils.getPrefsService("browser.cache.disk_cache_ssl."),
  EXPORTED_SYMBOLS = ["cacheMgr", "cookieMgr"],
  
  cacheMgr = {
    clearCache : function() {
      try {
        dump("clearing cache\n");
    	  cachService.evictEntries(CI.nsICache.STORE_ON_DISK);
    	  cachService.evictEntries(CI.nsICache.STORE_IN_MEMORY);
      }
      catch(e) {
        fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
        fp.notifier.alert(fp.getMessage("foxyproxy"),
          fp.getMessage("clearcache.error", [e]));
      }	 
    },

    disableCache : function() {
      dump("disabling cache\n");    
      networkHttpPrefs.setBoolPref("use-cache", false); // this might be enough
      diskCachePrefs.setBoolPref("enable", false); // but let's be safe
      memCachPrefs.setBoolPref("enable", false); // but let's be safe
      offlineCachePrefs.setBoolPref("enable", false); // but let's be safe
      sslCachePrefs.setBoolPref("enable", false); // but let's be safe
    }
  },
  
  cookieMgr = {
    clearCookies : function() {
      dump("clearing cookies\n");
      cookieService.removeAll();
    },

    rejectCookies : function() {
      dump("rejecting cookies\n");    
      cookiePrefs.setIntPref("cookieBehavior", 2);
    }
};
