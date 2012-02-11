// Constants
var CC = Components.classes,
  CI = Components.interfaces,
  CU = Components.utils,
  CR = Components.results;

CU.import("resource://gre/modules/XPCOMUtils.jsm");
var console = CC["@mozilla.org/consoleservice;1"].getService(CI.nsIConsoleService);

/**
 * FoxyProxy Api
 */
function api() {
  this.fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
  this.fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  this.wrappedJSObject = this; // So internal code can call non-public (API) functions
};

api.prototype = {
  fp: null,
  fpc: null,
  disableApi: false,

  /**
   * Load settings from contents of a webpage or other DOM source. We use
   * nsiConsoleService instead of our typical dump() for error messages. That
   * makes it easier for web developers to debug their web pages. We also
   * use the terminology "tag" instead of "node/element" in error messages
   * since that is the vernacular with web developers.
   */
  changeAllSettings : function(node, callback) {
    if (this.ignoreApi) return;

    // nodeName is always capitalized by Gecko so no need for case-insensitive check
    if (node.nodeName != "FOXYPROXY") {
      let msg = "Root tag must be named foxyproxy instead of '" + node.nodeName + "'";
      this._errorCallback(callback, msg);
      return;
    } 

    // User notification first
    let that = this;
    this.fpc.notify("proxy.scheme.warning.2", null, null, null, function() {
        that.fp.proxies.deleteAll(); // Delete all first. TODO: consider a merge algorithm instead
        that.fp.fromDOM(node, node);
        // TODO: update GUI because changes won't display if its already open
      },
    true);
  },

  /**
   * Change the mode to the one specified.
   * See foxyproxy.setMode() for acceptable mode values.
   * UNTESTED
   */
  setMode: function(newMode, callback) {
    if (this.ignoreApi) return;
    this.fp.setMode(newMode, false, true);
    if (this.fp.mode == newMode)
      this._successCallback(callback);
    else
      this._errorCallback(callback, "Unrecognized mode specified. Defaulting to \"disabled\"");
  },

  setDisableApi: function(b) {
    this.disableApi = b;
  },

  _successCallback: function(n) {
    if (n && n.success) {
      n.success();
    }
  },

  _errorCallback: function(n, msg) {
    console.logStringMessage("FoxyProxy: " + msg);
    if (n && n.error) {
      n.error(msg);
    }      
  },

  classID: Components.ID("{26e128d0-542c-11e1-b86c-0800200c9a66}"),  // uuid from IDL
 
  /** nsIClassInfo **/
  classInfo: XPCOMUtils.generateCI({ interfaces: ["fpApi"], classID: Components.ID("{26e128d0-542c-11e1-b86c-0800200c9a66}"),
    contractID: "@leahscape.org/foxyproxy/api;1", classDescription: "FoxyProxy Content API", flags: CI.nsIClassInfo.SINGLETON|CI.nsIClassInfo.DOM_OBJECT}),
  QueryInterface: XPCOMUtils.generateQI([CI.fpApi, CI.nsIClassInfo])
};
var NSGetFactory = XPCOMUtils.generateNSGetFactory([api]);
