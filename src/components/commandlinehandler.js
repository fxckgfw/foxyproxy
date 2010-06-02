const CC = Components.classes;
const CI = Components.interfaces;

const nsISupports           = CI.nsISupports;
const nsICategoryManager    = CI.nsICategoryManager;
const nsIComponentRegistrar = CI.nsIComponentRegistrar;
const nsICommandLine        = CI.nsICommandLine;
const nsICommandLineHandler = CI.nsICommandLineHandler;
const nsIFactory            = CI.nsIFactory;
const nsIModule             = CI.nsIModule;

const clh_contractID = "@mozilla.org/commandlinehandler/general-startup;1?type=foxyproxy";
const clh_CID = Components.ID("{ea321380-6b35-4e15-8d1e-fe6dc9c2ccae}");
const clh_category = "m-foxyproxy";

/**
 * The XPCOM component that implements nsICommandLineHandler.
 * It also implements nsIFactory to serve as its own singleton factory.
 */
const myAppHandler = {
  /* nsISupports */
  QueryInterface : function clh_QI(iid)
  {
    if (iid.equals(nsICommandLineHandler) ||
        iid.equals(nsIFactory) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsICommandLineHandler */
  handle : function clh_handle(cmdLine)
  {
    try {
      var mode = cmdLine.handleFlagWithParam("foxyproxy-mode", false);
      if (mode)
        CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject.setMode(mode, false, true);
    }
    catch (e) {
      Components.utils.reportError("incorrect parameter passed to -viewapp on the command line.");
    }
  },

  // Per nsICommandLineHandler.idl: flag descriptions should start at
  // character 24, and lines should be wrapped at
  // 72 characters with embedded newlines,
  // and finally, the string should end with a newline
  helpInfo : "  -foxyproxy-mode      Start FoxyProxy in the specified mode. Valid\n" +
             "                       values are:\n" +
             "                         patterns\n" +
             "                         disabled\n" +
             "                         <id of a proxy as specified in foxyproxy.xml's proxy element>\n" +
             "                         random (not supported)\n" +
             "                         roundrobin (not supported)\n",
  /* nsIFactory */
  createInstance : function clh_CI(outer, iid)
  {
    if (outer != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    return this.QueryInterface(iid);
  },

  lockFactory : function clh_lock(lock)
  {}
};

/**
 * The XPCOM glue that implements nsIModule
 */
const myAppHandlerModule = {
  /* nsISupports */
  QueryInterface : function mod_QI(iid)
  {
    if (iid.equals(nsIModule) ||
        iid.equals(nsISupports))
      return this;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  /* nsIModule */
  getClassObject : function mod_gch(compMgr, cid, iid)
  {
    if (cid.equals(clh_CID))
      return myAppHandler.QueryInterface(iid);

    throw Components.results.NS_ERROR_NOT_REGISTERED;
  },

  registerSelf : function mod_regself(compMgr, fileSpec, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);

    compMgr.registerFactoryLocation(clh_CID,
                                    "FoxyProxy CommandLine Handler",
                                    clh_contractID,
                                    fileSpec,
                                    location,
                                    type);

    var catMan = CC["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.addCategoryEntry("command-line-handler",
                            clh_category,
                            clh_contractID, true, true);
  },

  unregisterSelf : function mod_unreg(compMgr, location, type)
  {
    compMgr.QueryInterface(nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(clh_CID, location);

    var catMan = CC["@mozilla.org/categorymanager;1"].
      getService(nsICategoryManager);
    catMan.deleteCategoryEntry("command-line-handler", clh_category);
  },

  canUnload : function (compMgr)
  {
    return true;
  }
};

function NSGetModule(comMgr, fileSpec)
{
  return myAppHandlerModule;
}
