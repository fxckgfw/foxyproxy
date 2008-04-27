/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// common fcns used throughout foxyproxy.

var fp, CI = Components.interfaces, CC = Components.classes, CR = Components.results;
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// Common class///////////////////////
function Common() {
  this.wrappedJSObject = this;
  fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject;
}  
Common.prototype = {
  QueryInterface: gQueryInterface,

  // Application-independent version of getMostRecentWindow()
  getMostRecentWindow : function(wm) {
    var tmp = wm || Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    return tmp.getMostRecentWindow("navigator:browser") || tmp.getMostRecentWindow("Songbird:Main");
  },
  
  // Application-independent version of getEnumerator()
  getEnumerator : function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    // The next line always returns an object, even if the enum has no elements, so we can't use it to determine between applications
    //var e = wm.getEnumerator("navigator:browser") || wm.getEnumerator("Songbird:Main")
    return wm.getMostRecentWindow("navigator:browser") ? wm.getEnumerator("navigator:browser") : wm.getEnumerator("Songbird:Main");
  },

  openAndReuseOneTabPerURL : function(aURL) {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);

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
    var w = foxyproxy_common.getMostRecentWindow(wm);
    if (w) {
      // Use an existing browser window
      if (!w.delayedOpenTab) // SongBird
        setTimeout(function(aTabElt) { w.gBrowser.selectedTab = aTabElt; }, 0, w.gBrowser.addTab(aURL, null, null, null));
      else // FF
        w.delayedOpenTab(aURL, null, null, null, null);
    }
    else
      window.open(aURL);
  },
  
  validatePattern : function(win, isRegEx, p, msgPrefix) {
    var origPat = p, fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
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
      var ret = (Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService)
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
    var fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;
    e.setAttribute("label", args["labelId"]?fp.getMessage(args["labelId"], args["labelArgs"]) : args["labelVal"]);
    e.setAttribute("value", args["idVal"]);
    args["type"] && e.setAttribute("type", args["type"]);
    args["name"] && e.setAttribute("name", args["name"]);
    return e;
  },
  
  getVersion : function() {
    return Components.classes["@mozilla.org/extensions/manager;1"]
              .getService(Components.interfaces.nsIExtensionManager)
              .getItemForID("foxyproxy@eric.h.jung").version || "0.0";   
  },

  applyTemplate : function(url, urlTemplate, caseSensitive) { 
    var flags = caseSensitive ? "gi" : "g";
    try {
      // TODO: if match is a regex, escape reg chars that appear in the url
      var parsedUrl = this._ios.newURI(url, "UTF-8", null).QueryInterface(CI.nsIURL);
      var ret = urlTemplate.replace("${0}", parsedUrl.scheme?parsedUrl.scheme:"", flags);    
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
      return ret.replace("${15}", parsedUrl.spec?parsedUrl.spec:"", flags); 
    }
    catch(e) { /*happens for about:blank, about:config, etc.*/}
    return url;
  },    

  onQuickAdd : function(setupMode, url) {  
    var fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;  
    var q = fp.quickadd;
    var p = {inn:{url:url || foxyproxy_common.getMostRecentWindow().content.location, urlTemplate:q.urlTemplate, enabled:q.enabled,
      reload:q.reload, prompt:q.prompt, notify:q.notify, notifyWhenCanceled:q.notifyWhenCanceled,
      proxies:fp.proxies, match:q.match, setupMode:setupMode}, out:null};
     // q.proxy is null when user hasn't yet used QuickAdd
    if (q.proxy != null)
      p.inn.proxyId =  q.proxy.id;     
    window.openDialog("chrome://foxyproxy/content/quickadd.xul", "",
      "minimizable,dialog,chrome,resizable=yes,modal", p).focus();
    if (p.out) {
      p = p.out;
      q.enabled = p.enabled;
      q.reload = p.reload;
      q.notify = p.notify;
      q.prompt = p.prompt;
      q.proxy = fp.proxies.getProxyById(p.proxyId);
      q.notifyWhenCanceled = p.notifyWhenCanceled;
      q.urlTemplate = p.urlTemplate;    
      q.match.name = p.name;
      //q.match.pattern = p.pattern;
      q.match.caseSensitive = p.caseSensitive;          
      q.match.isRegEx = p.matchType=="r";
      q.match.isBlackList = p.isBlackList;
      fp.writeSettings();
      return p.pattern;          
    }
  },
  classID: Components.ID("{283e04e8-cfcd-47e8-8fcd-def4261ccdc0}"),
  contractID: "@leahscape.org/foxyproxy/common;1",
  classDescription: "FoxyProxy Common"
};

var gXpComObjects = [Common];
var gCatObserverName = "foxyproxy_catobserver";
var gCatContractId = Common.prototype.contractID;


function NSGetModule(compMgr, fileSpec) {
  gModule._catObserverName = gCatObserverName;
  gModule._catContractId = gCatContractId;

  for (var i in gXpComObjects)
    gModule._xpComObjects[i] = new gFactoryHolder(gXpComObjects[i]);

  return gModule;
}

function gFactoryHolder(aObj) {
  this.CID        = aObj.prototype.classID;
  this.contractID = aObj.prototype.contractID;
  this.className  = aObj.prototype.classDescription;
  this.factory =
  {
    createInstance: function(aOuter, aIID)
    {
      if (aOuter)
        throw CR.NS_ERROR_NO_AGGREGATION;

      return (new this.constructor).QueryInterface(aIID);
    }
  };

  this.factory.constructor = aObj;
}
var gModule = {
  registerSelf: function (aComponentManager, aFileSpec, aLocation, aType) {
    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._xpComObjects)
    {
      var obj = this._xpComObjects[key];
      aComponentManager.registerFactoryLocation(obj.CID, obj.className,
      obj.contractID, aFileSpec, aLocation, aType);
    }

    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.addCategoryEntry("app-startup", this._catObserverName, this._catContractId, true, true);
    catman.addCategoryEntry("xpcom-shutdown", this._catObserverName, this._catContractId, true, true);
  },

  unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.deleteCategoryEntry("app-startup", this._catObserverName, true);
    catman.deleteCategoryEntry("xpcom-shutdown", this._catObserverName, true);

    aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
    for (var key in this._xpComObjects)
    {
      var obj = this._xpComObjects[key];
      aComponentManager.unregisterFactoryLocation(obj.CID, aFileSpec);
    }
  },

  getClassObject: function(aComponentManager, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory))
      throw CR.NS_ERROR_NOT_IMPLEMENTED;

    for (var key in this._xpComObjects)
    {
      if (aCID.equals(this._xpComObjects[key].CID))
        return this._xpComObjects[key].factory;
    }

    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aComponentManager) { return true; },

  _xpComObjects: {},
  _catObserverName: null,
  _catContractId: null
};