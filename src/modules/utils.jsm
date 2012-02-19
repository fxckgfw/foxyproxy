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

/** TODO: Move all of components/common.js here **/

var CI = Components.interfaces, CC = Components.classes,
  gObsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService),
  EXPORTED_SYMBOLS = ["utils"], utils = {

  dumpp: function(e) {
    if (e) out(e);
    else {
      try {
        throw new Error("e");
      }
      catch (e) {out(e);}
    }
    function out(e) {dump("FoxyProxy Error: " + e + " \n\nCall Stack:\n" + e.stack + "\n");}
  },

  // Get attribute from node if it exists, otherwise return |def|.
  // No exceptions, no errors, no null returns.
  getSafeAttr: function(n, name, def) {
    if (!n) {dumpp(); return; }
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name) : def) : def;
  },

  // Boolean version of getSafeAttr()
  getSafeAttrB: function(n, name, def) {
    if (!n) {dumpp(); return; }
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name)=="true" : def) : def;
  },

  getPrefsService: function(branch) {
    return CC["@mozilla.org/preferences-service;1"].
      getService(CI.nsIPrefService).getBranch(branch);
  },

  // Broadcast a msg/notification optionally with data attached to the msg
  broadcast: function(subj, topic, data) {
    let bool = CC["@mozilla.org/supports-PRBool;1"].createInstance(CI.nsISupportsPRBool);
    bool.data = subj;
    let d;
    if (typeof(data) == "string" || typeof(data) == "number") {
      // It's a number when foxyproxy._mode is 3rd arg, and FoxyProxy is set to a proxy for all URLs
      d = CC["@mozilla.org/supports-string;1"].createInstance(CI.nsISupportsString);
      d.data = "" + data; // force to a string
    }
    else {
      if (data)
        d = data.QueryInterface(CI.nsISupports);
    }
    gObsSvc.notifyObservers(bool, topic, d);
  }
};
