/**
  FoxyProxy
  Copyright (C) 2006-2010 LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// Thanks for the template, doron (http://www.nexgenmedia.net/docs/protocol/)
const kSCHEME = "proxy";
const kPROTOCOL_NAME = "FoxyProxy Protocol";
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kPROTOCOL_CID = Components.ID("d1362868-da85-4faa-b1bf-24bfd936b0a6");
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;

const kSIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const kIOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const nsISupports = Components.interfaces.nsISupports;
const nsIIOService = Components.interfaces.nsIIOService;
const nsIProtocolHandler = Components.interfaces.nsIProtocolHandler;
const nsIURI = Components.interfaces.nsIURI;
const IOS = CC[kIOSERVICE_CONTRACTID].
        getService(nsIIOService).getProtocolHandler("file").
        QueryInterface(CI.nsIFileProtocolHandler);

function Protocol() {}

Protocol.prototype = {
  QueryInterface: function(iid) {
    if (!iid.equals(nsIProtocolHandler) &&
        !iid.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  scheme: kSCHEME,
  defaultPort: -1,
  protocolFlags: nsIProtocolHandler.URI_LOADABLE_BY_ANYONE,

  allowPort: function(port, scheme) {
    return false;
  },

  newURI: function(spec, charset, baseURI) {
    var uri = CC[kSIMPLEURI_CONTRACTID].createInstance(nsIURI);
    uri.spec = spec;
    return uri;
  },

  processURI : function(aURI) {
    dump("processURI\n");
    
    // aURI is a nsIUri, so get a string from it using .spec
    var uri = aURI.spec;
    // strip away the proxy: part
    uri = uri.substring(uri.indexOf(":") + 1, uri.length);
    // and, optionally, leading // as in proxy://
    if (uri.indexOf("//") == 0)
      uri = uri.substring(2);    
    uri = decodeURI(uri);
    // e.g. proxy:ip=xx.xx.xx.xx&port=yyyyy
    // Parse query params into nameValuePairs array
    var count = 0, nameValuePairs = [], queryParams = uri.split('&'), foundSomeInput;
    for (var i in queryParams) {
      var pair = queryParams[i].split('=');
      if (pair.length == 2) {
        nameValuePairs[pair[0]] = pair[1];
        foundSomeInput = true;
      }
    }
    if (!foundSomeInput) return;
    var proxy = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance().wrappedJSObject;
    proxy.fromAssociateArray(nameValuePairs);
    // We accept URIs like this:
    //   proxy:foxyProxyMode=disabled
    // with no other parameters. In cases like that, we must skip the
    // create/update/delete proxy code otherwise we'll create an empty/useless proxy
    // Note: |uri| has been stripped of its scheme at this point.
    var fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    if (!(/^foxyProxyMode=[^&]*$/.test(uri))) {
      // Are we adding a new proxy, or deleting or updating an existing one? Default is to updateOrAdd.
      if (!nameValuePairs["action"]) { /* no action was specified */
          nameValuePairs["action"] = "updateOrAdd";
      }
      switch (nameValuePairs["action"]) {
        case "update":
          var p = fp.proxies.mergeByName(proxy, nameValuePairs);
          if (p) {
            proxy = p;
            fp.broadcast(null, "foxyproxy-proxy-change");
          }
          break;
        case "add":
          fp.proxies.insertAt(nameValuePairs["position"], proxy);
          fp.broadcast(null, "foxyproxy-proxy-change");
          break;
        case "delete": /* deliberate fall-through */
        case "deleteOne":
          fp.proxies.deleteByName(proxy.name, false);
          fp.broadcast(null, "foxyproxy-proxy-change");
          break;
        case "deleteMultiple":
          fp.proxies.deleteByName(proxy.name, true);
          fp.broadcast(null, "foxyproxy-proxy-change");
          break;
        case "updateOrAdd":
          var p = fp.proxies.mergeByName(proxy, nameValuePairs);
          if (p)
            proxy = p;
          else
            fp.proxies.insertAt(nameValuePairs["position"], proxy);
          fp.broadcast(null, "foxyproxy-proxy-change");
          break;
      }
      fp.writeSettings(); // Save to disk
    }
    
    // If foxyProxyMode was specified as "this", translate that to something that fp.setMode() understands.
    // Can't set mode to "this" if you're deleting.
    if (nameValuePairs["foxyProxyMode"] == "this") {
      nameValuePairs["foxyProxyMode"] = 
        nameValuePairs["action"] == "delete" || nameValuePairs["action"] == "deleteOne" || nameValuePairs["action"] == "deleteMultiple" ?
        null :
        proxy.id;
    }
    // If a proxy name was specifed, get its ID and use that for new foxyproxy mode.
    else if (nameValuePairs["foxyProxyMode"] != "patterns" && nameValuePairs["foxyProxyMode"] != "disabled" &&
        nameValuePairs["foxyProxyMode"] != "random" && nameValuePairs["foxyProxyMode"] != "previous" && 
        nameValuePairs["foxyProxyMode"] != "roundrobin" && !fp.proxies.getProxyById(nameValuePairs["foxyProxyMode"])) {
      var proxy = fp.proxies.getProxyByName(nameValuePairs["foxyProxyMode"]);
      if (proxy)
        nameValuePairs["foxyProxyMode"] = proxy.id;
    }     
    
    // Set mode last in case user is setting mode to the proxy we just configured.
    // (In that case, setting mode earlier will result in the proxy not being found)
    if (nameValuePairs["foxyProxyMode"]) {
      fp.setMode(nameValuePairs["foxyProxyMode"], true);  
      fp.broadcast(null, "foxyproxy-mode-change");
    }
    
    // User-feedback?
    if (nameValuePairs["confirmation"] == "popup") {
      fp.notifier.alert(fp.getMessage("foxyproxy"), fp.getMessage("proxy.configured", [nameValuePairs["name"]]));
      return;
    }
    else if (nameValuePairs["confirmation"]) {
      // Is it a valid URL?
      try {
        CC["@mozilla.org/network/io-service;1"]
           .getService(CI.nsIIOService).newURI(nameValuePairs["confirmation"], "UTF-8", null);
      }
      catch(e) {/* not a valid URL */ return; }
      CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject
        .openTab(nameValuePairs["confirmation"]);
    }   
  },
  
  newChannel: function(aURI) {
    var fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
    if (fp.ignoreProxyScheme) return new nsDummyChannel();
    
    // user notification first
    var fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
    var fpph = this;
    var buttons = [
      { label: fp.getMessage("yes"),
        accessKey: fp.getMessage("yes.accesskey"),
        popup: null, 
        callback: function(nb, button) {
          fpph.processURI(aURI);
        }
      },
      {
        label: fp.getMessage("no"),
        accessKey: fp.getMessage("no.accesskey"),
        popup: null, 
        callback: function(nb, button) {
        }
      }
    ];
    fpc.notify("proxy.scheme.warning", buttons);
    return new nsDummyChannel();
  }
}

// BEGIN: Dummy channel implementation - thanks mark finkle and http://mxr.mozilla.org/mobile-browser/source/components/protocols/nsTelProtocolHandler.js#49
function nsDummyChannel() {}

nsDummyChannel.prototype.QueryInterface =
function bc_QueryInterface(iid) {
  if (!iid.equals(CI.nsIChannel) && !iid.equals(CI.nsIRequest) &&
      !iid.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

/* nsIChannel */
nsDummyChannel.prototype.loadAttributes = null;
nsDummyChannel.prototype.contentLength = 0;
nsDummyChannel.prototype.owner = null;
nsDummyChannel.prototype.loadGroup = null;
nsDummyChannel.prototype.notificationCallbacks = null;
nsDummyChannel.prototype.securityInfo = null;

nsDummyChannel.prototype.open =
nsDummyChannel.prototype.asyncOpen =
function bc_open(observer, ctxt) {
  // We don't throw this (a number, not a real 'resultcode') because it
  // upsets xpconnect if we do (error in the js console).
  Components.returnCode = CR.NS_ERROR_NO_CONTENT;
}

nsDummyChannel.prototype.asyncRead =
function bc_asyncRead(listener, ctxt) {
  throw CR.NS_ERROR_NOT_IMPLEMENTED;
}

/* nsIRequest */
nsDummyChannel.prototype.isPending =
function bc_isPending() {
    return true;
}

nsDummyChannel.prototype.status = CR.NS_OK;

nsDummyChannel.prototype.cancel =
function bc_cancel(status) {
    this.status = status;
}

nsDummyChannel.prototype.suspend =
nsDummyChannel.prototype.resume =
function bc_suspres() {
    throw CR.NS_ERROR_NOT_IMPLEMENTED;
}
// END: Dummy channel implementation - thanks mark finkle and http://mxr.mozilla.org/mobile-browser/source/components/protocols/nsTelProtocolHandler.js#49

var ProtocolFactory = new Object();

ProtocolFactory.createInstance = function (outer, iid) {
  if (outer != null)
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  if (!iid.equals(nsIProtocolHandler) &&
      !iid.equals(nsISupports))
    throw Components.results.NS_ERROR_NO_INTERFACE;
  var p = new Protocol();
  return p;
}

/**
 * JS XPCOM boilerplate component registration code.
 */
var prochandler = new Object();

prochandler.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(kPROTOCOL_CID,
                                  kPROTOCOL_NAME,
                                  kPROTOCOL_CONTRACTID,
                                  fileSpec,
                                  location,
                                  type);
}

prochandler.getClassObject = function (compMgr, cid, iid) {
  if (!cid.equals(kPROTOCOL_CID))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  if (!iid.equals(Components.interfaces.nsIFactory))
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  return ProtocolFactory;
}

prochandler.canUnload = function (compMgr) {
  return true;
}

function NSGetModule(compMgr, fileSpec){
  return prochandler;
}
