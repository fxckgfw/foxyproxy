/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// Thanks for the template, doron (http://www.nexgenmedia.net/docs/protocol/)
const kSCHEME = "relative";
const kPROTOCOL_NAME = "FoxyProxy Relative Protocol";
const kPROTOCOL_CONTRACTID = "@mozilla.org/network/protocol;1?name=" + kSCHEME;
const kPROTOCOL_CID = Components.ID("22ed2962-a8ec-11dc-8314-0800200c9a66");
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;

// Mozilla defined
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
  protocolFlags: nsIProtocolHandler.URI_DANGEROUS_TO_LOAD,

  allowPort: function(port, scheme) {
    return false;
  },

  newURI: function(spec, charset, baseURI) {
    var uri = Components.classes[kSIMPLEURI_CONTRACTID].createInstance(nsIURI);
    uri.spec = spec;
    return uri;
  },

  newChannel: function(aURI) {
    // aURI is a nsIUri, so get a string from it using .spec
    var uri = aURI.spec;

    // strip away the kSCHEME: part
    uri = uri.substring(uri.indexOf(":") + 1, uri.length);
    // and, optionally, leading // as in kSCHEME://
    uri.indexOf("//") == 0 && (uri = uri.substring(2));
    uri = uri.replace(/\\/g,"/"); // replace any backslashes with forward slashes
    var parts = uri.split("/");
    var file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
    var dir = CC["@mozilla.org/file/directory_service;1"].getService(CI.nsIProperties).get(parts[0], CI.nsILocalFile);
    file.initWithPath(dir.path);
    // Note: start loop at 1, not 0
    for (var i=1,sz=parts.length; i<sz; i++)
      file.appendRelativePath(parts[i]);
    var pHandler = CC[kIOSERVICE_CONTRACTID].
        getService(nsIIOService).getProtocolHandler("file").
        QueryInterface(CI.nsIFileProtocolHandler);
    return pHandler.newChannel(pHandler.newFileURI(file, null, null));
  },
}

var ProtocolFactory = new Object();

ProtocolFactory.createInstance = function (outer, iid) {
  if (outer != null)
    throw Components.results.NS_ERROR_NO_AGGREGATION;

  if (!iid.equals(nsIProtocolHandler) &&
      !iid.equals(nsISupports))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return new Protocol();
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
