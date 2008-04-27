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
// functions within this object don't use |this|. instead, they use |foxyproxy_common| in case
// the function is called from a callback or closure in which |this| refers to something else.
var foxyproxy_common = {

  fp : Components.classes["@leahscape.org/foxyproxy/service;1"].getService(Components.interfaces.nsISupports).wrappedJSObject,

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
    var origPat = p, fpp = foxyproxy_common.fp;
    p = p.replace(/^\s*|\s*$/g,"");
    if (p == "") {
      fpp.alert(window, (msgPrefix?msgPrefix+": ":"") + fpp.getMessage("pattern.required"));
      return false;
    }
    if (isRegEx) {
      try {
        new RegExp((p[0]=="^"?"":"^") + p + (p[p.length-1]=="$"?"":"$"));
      }
      catch(e) {
        fpp.alert(win, (msgPrefix?msgPrefix+": ":"") + fpp.getMessage("pattern.invalid.regex", [origPat]));
        return false;
      }
    }
    else if (p.indexOf("*") == -1 && p.indexOf("?") == -1 && !fpp.warnings.noWildcards) {
      // No wildcards present; warn user
      var cb = {};
      var ret = (Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService)
        .confirmCheck(win, fpp.getMessage("foxyproxy"), (msgPrefix?msgPrefix+": ":"") + fpp.getMessage("no.wildcard.characters", [p]), fpp.getMessage("message.stop"), cb));
      fpp.warnings.noWildcards = cb.value;
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
    e.setAttribute("label", args["labelId"]?foxyproxy_common.fp.getMessage(args["labelId"], args["labelArgs"]) : args["labelVal"]);
    e.setAttribute("value", args["idVal"]);
    args["type"] && e.setAttribute("type", args["type"]);
    args["name"] && e.setAttribute("name", args["name"]);
    return e;
  },

  /**
   * Update the list of menuitems in |menu|
   */
  updateSuperAddProxyMenu : function(superadd, menu, fcn, doc) {
    if (!superadd.enabled) return;
    var popup=menu.firstChild;
    foxyproxy_common.removeChildren(popup);
    for (var i=0,c=0,p; i<foxyproxy_common.fp.proxies.length && ((p=foxyproxy_common.fp.proxies.item(i)) || 1); i++) {
      if (!p.lastresort && p.enabled) {
        popup.appendChild(foxyproxy_common.createMenuItem({idVal:p.id, labelVal:p.name, type:"radio", name:"foxyproxy-enabled-type",
          document:doc}));
        //popup.appendChild(foxyproxy_common.createMenuItem({idVal:"disabled", labelId:"mode.disabled.label"}));
        c++;
      }
    }
    function selFirst() {
      // select the first one
      var temp = popup.firstChild && popup.firstChild.id;
      temp && fcn((menu.value = temp));
    }

    if (superadd.proxy) {
      menu.value = superadd.proxy.id;
    }
    else
      selFirst();
    menu.selectedIndex == -1 && selFirst();
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
    var q = foxyproxy_common.fp.quickadd;
    var p = {inn:{url:url || foxyproxy_common.getMostRecentWindow().content.location, urlTemplate:q.urlTemplate, enabled:q.enabled,
      reload:q.reload, prompt:q.prompt, notify:q.notify, notifyWhenCanceled:q.notifyWhenCanceled,
      proxies:foxyproxy.proxies, match:q.match, setupMode:setupMode}, out:null};
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
      q.proxy = foxyproxy_common.fp.proxies.getProxyById(p.proxyId);
      q.notifyWhenCanceled = p.notifyWhenCanceled;
      q.urlTemplate = p.urlTemplate;    
      q.match.name = p.name;
      //q.match.pattern = p.pattern;
      q.match.caseSensitive = p.caseSensitive;          
      q.match.isRegEx = p.matchType=="r";
      q.match.isBlackList = p.isBlackList;
      foxyproxy_common.fp.writeSettings();
      return p.pattern;          
    }
  }
};