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

var CI = Components.interfaces, Cc = Components.classes,
  cachService = CC["@mozilla.org/network/cache-service;1"].getService(CI.nsICacheService),
  cookieService = CC["@mozilla.org/cookiemanager;1"].getService(CI.nsICookieManager),
  EXPORTED_SYMBOLS = ["cacheMgr, cookieMgr"];

var cacheMgr = {
  clearCache : function() {
    try {
  	  cachService.evictEntries(CI.nsICache.STORE_ON_DISK);
  	  cachService.evictEntries(CI.nsICache.STORE_IN_MEMORY);
    }
    catch(e) {
      this.notifier.alert(this.getMessage("foxyproxy"),
        this.getMessage("clearcache.error", [e]));
    }	 
  },

  disableCache : function() {
  }
};

var cookieMgr = {
  clearCookies : function() {
    cookieService.removeAll();
  },

  rejectCookies : function() {
  }
};
