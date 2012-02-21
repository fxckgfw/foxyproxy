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
  // We let |fp| manage |disableApi| serialization. Note we do not want to
  // expose a setter for this variable, just a getter. If we exposed a setter,
  // websites could enable the API when it is disabled.
  this.disableApi = this.fp.disableApi;
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
    if (this.disableApi) return;

    // nodeName is always capitalized by Gecko so no need for case-insensitive check
    if (node.nodeName != "FOXYPROXY") {
      let msg = "Root tag must be named foxyproxy instead of '" + node.nodeName + "'";
      this._errorCallback(callback, msg);
      return;
    } 

    this._promptUser(function(not, btn) {
      let that = btn.callbackArgs;
      that.fp.proxies.deleteAll(); // Delete all first. TODO: consider a merge algorithm instead
      that.fp.fromDOM(node, node);
      // TODO: update GUI because changes won't display if its already open
      that._successCallback(callback);
    });
  },

  /**
   * Ask user
   */
   _promptUser: function(callback) {
      // User notification first
      let that = this;
      this.fpc.notify("proxy.scheme.warning.2", null, null, null, callback,
        true, that);
   },

  /**
   * Change the mode to the one specified.
   * See foxyproxy.setMode() for acceptable mode values.
   * This version allows caller to provide a callback function, unlike
   * the |mode| property setter
   */
  setMode: function(newMode, callback) {
    if (this.disableApi) return;
    this._promptUser(function(not, btn) {
      let that = btn.callbackArgs;
      that.fp.setMode(newMode, true, false);
      if (that.fp.mode == newMode)
        that._successCallback(callback);
      else
        that._errorCallback(callback, "Unrecognized mode specified. Defaulting to \"disabled\"");
    });
  },

  /**
   * Change the mode to the one specified.
   * See foxyproxy.setMode() for acceptable mode values.
   * This version does not allow caller to provide a callback function, unlike
   * the setMode() function.
   */
  set mode(newMode) {
    if (this.disableApi) return;
    this._promptUser(function(not, btn) {
      let that = btn.callbackArgs;
      that.fp.setMode(newMode, true, false);
    });
  },

  /**
   * Get the current foxyproxy mode.
   * See foxyproxy.setMode() for possible values.
   */
  get mode() {
    if (this.disableApi) return;
    return this.fp.mode;
  },

  /**
   * Returns true if we ignore API calls; false if we act on them. Note: this
   * is the only function which we expose regardless of the value of |disableApi|.
   * In this way, webpages can determine if they can successfully instrument
   * foxyproxy and possibly inform the user if they cannot.
   */
  get apiDisabled() {
    return this.disableApi;
  },

  /**
   * Returns a JSON object with two properties: name and version.
   * |name| is the name of the addon installed, one of:
   * "FoxyProxyBasic", "FoxyProxyStandard", or "FoxyProxyPlus"
   * |version| is the version of the installed addon.
   */ 
  get version() {
    if (this.disableApi) return;
    var name;
    if (this.fp.isFoxyProxySimple())
      name = "FoxyProxyBasic";
    else {
      // Are we Standard or Plus?
      try {
        CC["@leahscape.com/foxyproxyplus/licenseresolver;1"].getService().wrappedJSObject;
        name = "FoxyProxyPlus"; // Note: untested so far
      }
      catch (e) {
        name = "FoxyProxyStandard";
      }      
    }
    return '{"version": "' + this.fpc.getVersion() + '", "name": "' + name + '"}';
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

 
  // nsIClassInfo
  /*
    Gecko 2.x only (doesn't work with Firefox 3.6.x)
      classInfo: generateCI({ interfaces: ["foxyProxyApi"], classID: Components.ID("{26e128d0-542c-11e1-b86c-0800200c9a66}"),
      contractID: "@leahscape.org/foxyproxy/api;1",
      classDescription: "FoxyProxy Content API", flags: CI.nsIClassInfo.SINGLETON|CI.nsIClassInfo.DOM_OBJECT}),
  */

  flags: CI.nsIClassInfo.SINGLETON|CI.nsIClassInfo.DOM_OBJECT,
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  getHelperForLanguage: function(language) null,
  getInterfaces: function(count) {
    let interfaces = [CI.foxyProxyApi];
    count.value = interfaces.length;
    return interfaces;
  },
  classDescription: "FoxyProxy Content API",
  contractID: "@leahscape.org/foxyproxy/api;1",
  classID: Components.ID("{26e128d0-542c-11e1-b86c-0800200c9a66}"), // uuid from IDL

  QueryInterface: XPCOMUtils.generateQI([CI.foxyProxyApi, CI.nsIClassInfo]),

  _xpcom_factory: {
    singleton: null,
    createInstance: function (aOuter, aIID) {
      if (aOuter) throw CR.NS_ERROR_NO_AGGREGATION;
      if (!this.singleton) this.singleton = new api();
      return this.singleton.QueryInterface(aIID);
    }
  }
};
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4)
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 and earlier (Firefox 3.6)
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([api]);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule([api]);
