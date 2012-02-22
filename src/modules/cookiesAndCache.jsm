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

let CI = Components.interfaces, CC = Components.classes, CU = Components.utils,
  cachService = CC["@mozilla.org/network/cache-service;1"].
    getService(CI.nsICacheService),
  cookieService = CC["@mozilla.org/cookiemanager;1"].
    getService(CI.nsICookieManager);

CU.import("resource://foxyproxy/utils.jsm");

let cookiePrefs = utils.getPrefsService("network.cookie."),
  networkHttpPrefs = utils.getPrefsService("network.http."),
  cachePrefs = utils.getPrefsService("browser.cache."),
  securityPrefs = utils.getPrefsService("security."),

  EXPORTED_SYMBOLS = ["cacheMgr", "cookieMgr"],
  
  cacheMgr = {
    clearCache : function() {
      try {
        dump("clearing cache\n");
    	  cachService.evictEntries(CI.nsICache.STORE_ON_DISK);
    	  cachService.evictEntries(CI.nsICache.STORE_IN_MEMORY);
        // Thanks, Torbutton
        try {
          // This exists in FF 3.6.x. Perhaps we can drop the catch block and
          // the "old method".
          CC["@mozilla.org/security/crypto;1"].getService(CI.nsIDOMCrypto).
            logout();
        }
        catch(e) {
          // Failed to use nsIDOMCrypto to clear SSL Session ids.
          // Falling back to old method.
          // This clears the SSL Identifier Cache.
          // See https://bugzilla.mozilla.org/show_bug.cgi?id=448747 and
          // http://mxr.mozilla.org/security/source/security/manager/ssl/src/nsNSSComponent.cpp#2134
          // This results in clearSessionCache being set to true temporarily.
          securityPrefs.setBoolPref("enable_ssl3",
            !securityPrefs.getBoolPref("enable_ssl3"));
          securityPrefs.setBoolPref("enable_ssl3",
            !securityPrefs.getBoolPref("enable_ssl3"));     
        }
      }
      catch(e) {
        let fp = CC["@leahscape.org/foxyproxy/service;1"].getService().
          wrappedJSObject;
        fp.notifier.alert(fp.getMessage("foxyproxy"),
          fp.getMessage("clearcache.error", [e]));
      }
    },

    disableCache : function() {
      dump("disabling cache\n");    
      networkHttpPrefs.setBoolPref("use-cache", false); // this might be enough
      cachePrefs.setBoolPref("disk.enable", false); // but let's be safe
      cachePrefs.setBoolPref("memory.enable", false); // but let's be safe
      cachePrefs.setBoolPref("offline.enable", false); // but let's be safe
      cachePrefs.setBoolPref("disk_cache_ssl", false); // but let's be safe
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

