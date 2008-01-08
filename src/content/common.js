/**
  FoxyProxy
  Copyright (C) 2006,2007,2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// common fcns used throughout foxyproxy
var foxyproxy_common = {

  fp : Components.classes["@leahscape.org/foxyproxy/service;1"]
       .getService(Components.interfaces.nsISupports).wrappedJSObject,

  // Application-independent version of getMostRecentWindow()
  getMostRecentWindow : function() {
    // window.arguments is null if user opened about.xul from EM's Options button
    var tmp = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
    tmp = tmp.getMostRecentWindow("navigator:browser") || tmp.getMostRecentWindow("Songbird:Main");
    overlay = tmp.foxyproxy;
  },

  validatePattern : function(win, isRegEx, p, msgPrefix) {
    var origPat = p;
    p = p.replace(/^\s*|\s*$/g,"");
    if (p == "") {
      foxyproxy.alert(window, (msgPrefix?msgPrefix+": ":"") + this.fp.getMessage("pattern.required"));
      return false;
    }
    if (isRegEx) {
      try {
        new RegExp((p[0]=="^"?"":"^") + p + (p[p.length-1]=="$"?"":"$"));
      }
      catch(e) {
        foxyproxy.alert(win, (msgPrefix?msgPrefix+": ":"") + this.fp.getMessage("pattern.invalid.regex", [origPat]));
        return false;
      }
    }
    else if (p.indexOf("*") == -1 && p.indexOf("?") == -1 && !this.fp.warnings.noWildcards) {
      // No wildcards present; warn user
      var cb = {};
      var ret = (Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService)
        .confirmCheck(win, this.fp.getMessage("foxyproxy"), (msgPrefix?msgPrefix+": ":"") + this.fp.getMessage("no.wildcard.characters", [p]), this.fp.getMessage("message.stop"), cb));
      this.fp.warnings.noWildcards = cb.value;
      if (!ret) return false;
    }
    return p;
  },

  onQuickAddProxyChanged : function(proxyId) {
    var fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    fp.quickadd.proxy = fp.proxies.getProxyById(proxyId);
  },

  removeChildren : function(node) {
    while (node.hasChildNodes())
      node.removeChild(node.firstChild);
  },

  createMenuItem : function(args) {
    var doc = args.document || document;
    var e = doc.createElement("menuitem");
    e.setAttribute("id", args["idVal"]);
    e.setAttribute("label", args["labelId"]?this.fp.getMessage(args["labelId"], args["labelArgs"]) : args["labelVal"]);
    e.setAttribute("value", args["idVal"]);
    args["type"] && e.setAttribute("type", args["type"]);
    args["name"] && e.setAttribute("name", args["name"]);
    return e;
  },

  updateSuperAddProxyMenu : function(superadd, menu, fcn, doc) {
    if (!superadd.enabled) return;
    var popup=menu.firstChild;
    foxyproxy_common.removeChildren(popup);
    for (var i=0,c=0,p; i<this.fp.proxies.length && ((p=this.fp.proxies.item(i)) || 1); i++) {
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
  }
};