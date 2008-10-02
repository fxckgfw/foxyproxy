/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// common fcns used throughout foxyproxy, exposed a an xpcom service

const CI = Components.interfaces;
const CC = Components.classes;

function Common() {
  this.wrappedJSObject = this;
}

Common.prototype = {
  _ios : CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService),

  QueryInterface: function(aIID) {
    if (!aIID.equals(CI.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  // Application-independent version of getMostRecentWindow()
  getMostRecentWindow : function(wm) {
    var tmp = wm || CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
    return tmp.getMostRecentWindow("navigator:browser") || tmp.getMostRecentWindow("Songbird:Main");
  },

  // Application-independent version of getEnumerator()
  getEnumerator : function() {
    var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
    // The next line always returns an object, even if the enum has no elements, so we can't use it to determine between applications
    //var e = wm.getEnumerator("navigator:browser") || wm.getEnumerator("Songbird:Main")
    return wm.getMostRecentWindow("navigator:browser") ? wm.getEnumerator("navigator:browser") : wm.getEnumerator("Songbird:Main");
  },

  openAndReuseOneTabPerURL : function(aURL) {
    var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
    var winEnum = wm.getEnumerator("navigator:browser") || wm.getEnumerator("Songbird:Main");
    while (winEnum.hasMoreElements()) {
      var win = winEnum.getNext();
      var browser = win.getBrowser();
      for (var i = 0; i < browser.mTabs.length; i++) {
        if (aURL == browser.getBrowserForTab(browser.mTabs[i]).currentURI.spec) {
          win.focus(); // bring wnd to the foreground
          browser.selectedTab = browser.mTabs[i];
          return;
        }
      }
    }

    // Our URL isn't open. Open it now.
    var w = this.getMostRecentWindow(wm);
    if (w) {
      // Use an existing browser window
      if (!w.delayedOpenTab) // SongBird
        setTimeout(function(aTabElt) { w.gBrowser.selectedTab = aTabElt; }, 0, w.gBrowser.addTab(aURL, null, null, null));
      else // FF
        w.delayedOpenTab(aURL, null, null, null, null);
      w.focus();
    }
  },

  validatePattern : function(win, isRegEx, p, msgPrefix) {
    var origPat = p, fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    p = p.replace(/^\s*|\s*$/g,"");
    if (p == "") {
      fp.alert(win, (msgPrefix?msgPrefix+": ":"") + fp.getMessage("pattern.required"));
      return false;
    }
    if (isRegEx) {
      try {
        new RegExp((p[0]=="^"?"":"^") + p + (p[p.length-1]=="$"?"":"$"));
      }
      catch(e) {
        fp.alert(win, (msgPrefix?msgPrefix+": ":"") + fp.getMessage("pattern.invalid.regex", [origPat]));
        return false;
      }
    }
    else if (p.indexOf("*") == -1 && p.indexOf("?") == -1 && !fp.warnings.noWildcards) {
      // No wildcards present; warn user
      var cb = {};
      var ret = (CC["@mozilla.org/embedcomp/prompt-service;1"].getService(CI.nsIPromptService)
        .confirmCheck(win, fp.getMessage("foxyproxy"), (msgPrefix?msgPrefix+": ":"") + fp.getMessage("no.wildcard.characters", [p]), fp.getMessage("message.stop"), cb));
      fp.warnings.noWildcards = cb.value;
      if (!ret) return false;
    }
    return p;
  },

  removeChildren : function(node) {
    while (node.hasChildNodes())
      node.removeChild(node.firstChild);
  },

  createMenuItem : function(args) {
    var doc = args.document || document;
    var e = doc.createElement("menuitem");
    e.setAttribute("id", args["idVal"]);
    var fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    e.setAttribute("label", args["labelId"]?fp.getMessage(args["labelId"], args["labelArgs"]) : args["labelVal"]);
    e.setAttribute("value", args["idVal"]);
    args["type"] && e.setAttribute("type", args["type"]);
    args["name"] && e.setAttribute("name", args["name"]);
    return e;
  },

  getVersion : function() {
    return CC["@mozilla.org/extensions/manager;1"]
              .getService(CI.nsIExtensionManager)
              .getItemForID("foxyproxy@eric.h.jung").version || "0.0";
  },

  applyTemplate : function(url, strTemplate, caseSensitive) {
    var flags = caseSensitive ? "gi" : "g";
    try {
      var parsedUrl = this._ios.newURI(url, "UTF-8", null).QueryInterface(CI.nsIURL);
      var ret = strTemplate.replace("${0}", parsedUrl.scheme?parsedUrl.scheme:"", flags);
      ret = ret.replace("${1}", parsedUrl.username?parsedUrl.username:"", flags);
      ret = ret.replace("${2}", parsedUrl.password?parsedUrl.password:"", flags);
      ret = ret.replace("${3}", parsedUrl.userPass?(parsedUrl.userPass+"@"):"", flags);
      ret = ret.replace("${4}", parsedUrl.host?parsedUrl.host:"", flags);
      ret = ret.replace("${5}", parsedUrl.port == -1?"":parsedUrl.port, flags);
      ret = ret.replace("${6}", parsedUrl.hostPort?parsedUrl.hostPort:"", flags);
      ret = ret.replace("${7}", parsedUrl.prePath?parsedUrl.prePath:"", flags);
      ret = ret.replace("${8}", parsedUrl.directory?parsedUrl.directory:"", flags);
      ret = ret.replace("${9}", parsedUrl.fileBaseName?parsedUrl.fileBaseName:"", flags);
      ret = ret.replace("${10}", parsedUrl.fileExtension?parsedUrl.fileExtension:"", flags);
      ret = ret.replace("${11}", parsedUrl.fileName?parsedUrl.fileName:"", flags);
      ret = ret.replace("${12}", parsedUrl.path?parsedUrl.path:"", flags);
      ret = ret.replace("${13}", parsedUrl.ref?parsedUrl.ref:"", flags);
      ret = ret.replace("${14}", parsedUrl.query?parsedUrl.query:"", flags);
      ret = ret.replace("${14}", parsedUrl.query?parsedUrl.query:"", flags);
      ret = ret.replace("${15}", parsedUrl.spec?parsedUrl.spec:"", flags);
      /*ret = ret.replace(/\^|\$|\+|\\|\||\*|\{|\}|\(|\)|\[|\]/g,
        function(s) {
          switch(s) {
            case "^":return "\\^";break;
            case "$":return "\\$";break;
            case "+":return "\\+";break;
            case "\\":return "\\\\";break;
            case ".":return "\\.";break;
            case "|":return "\\|";break;
            case "*":return "\\*";break;
            case "{":return "\\{";break;
            case "}":return "\\}";break;
            case "(":return "\\(";break;
            case ")":return "\\)";break;
            case "[":return "\\[";break;
            case "]":return "\\]";break;
          }
        }
      );*/
      return ret;
    }
    catch(e) {/*happens for about:blank, about:config, etc.*/}
    return url;
  },

  onSuperAdd : function(wnd, url, superadd) {
    var fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    var p = {inn:{url:url || this.getMostRecentWindow().content.location.href, superadd:superadd}, out:null};
    // superadd.proxy is null when user hasn't yet used QuickAdd
    if (superadd.proxy != null)
      p.inn.proxyId = superadd.proxy.id;
    wnd.openDialog("chrome://foxyproxy/content/superadd.xul", "",
      "minimizable,dialog,chrome,resizable=yes,modal", p).focus();
    if (p.out) {
      // Copy any changes
      p = p.out;
      superadd.reload = p.reload;
      superadd.notify = p.notify;
      superadd.prompt = p.prompt;
      superadd.notifyWhenCanceled = p.notifyWhenCanceled;
      superadd.proxy = fp.proxies.getProxyById(p.proxyId);
      fp.writeSettings();
      return p.match;
    }
  }
}
// Factory
var CommonFactory = {
  singleton: null,
  createInstance: function (aOuter, aIID) {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (this.singleton == null)
      this.singleton = new Common();
    return this.singleton.QueryInterface(aIID);
  }
};


const CLASS_ID = Components.ID("ecbe324b-9ad7-401a-a272-5cc1efba9be6");

// Module
var CommonModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, "FoxyProxy Common", "@leahscape.org/foxyproxy/common;1", aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);
  },

  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return CommonFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return CommonModule; }