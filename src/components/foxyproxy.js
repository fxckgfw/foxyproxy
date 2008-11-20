/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// See http://forums.mozillazine.org/viewtopic.php?t=308369

// Don't const the next line anymore because of the generic reg code
//dump("foxyproxy.js\n");
var CI = Components.interfaces, CC = Components.classes, CR = Components.results, gFP;

var dumpp = function(e) {
  if (e) out(e);
  else {
    try {
      throw new Error("e");
    }
    catch (e) {out(e);} 
  } 
  function out(e) {dump("FoxyProxy: " + e + " \n\n" + e.stack + "\n");}
}
// Get attribute from node if it exists, otherwise return |def|.
// No exceptions, no errors, no null returns.
var gGetSafeAttr = function(n, name, def) {
  if (!n) {dumpp(); return; }
  n.QueryInterface(CI.nsIDOMElement);
	return n ? (n.hasAttribute(name) ? n.getAttribute(name) : def) : def;
};
// Boolean version of GetSafe
var gGetSafeAttrB = function(n, name, def) {
  if (!n) {dumpp(); return; }
  n.QueryInterface(CI.nsIDOMElement);
	return n ? (n.hasAttribute(name) ? n.getAttribute(name)=="true" : def) : def;
};
var loadComponentScript = function(filename) {
  try {
    var filePath = componentDir.clone();
    filePath.append(filename);
    loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
  }
  catch (e) {
    dump("Error loading component " + filename + ": " + e + "\n" + e.stack + "\n");
    throw(e);
  }  
};
var loadModuleScript = function(filename) {
  try {
    var filePath = componentDir.clone();
    filePath = filePath.parent;
    filePath.append("modules");
    filePath.append(filename);
    loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
  }
  catch (e) {
    dump("Error loading module " + filename + ": " + e + "\n" + e.stack + "\n");
    throw(e);
  }  
};
var gLoggEntryFactory = function(proxy, aMatch, uri, type, errMsg) {
    return new LoggEntry(proxy, aMatch, foxyproxy.prototype.logg._noURLs ? foxyproxy.prototype.logg.noURLsMessage : uri, type, errMsg);
	},
  gObsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService),
	gBroadcast = function(subj, topic, data) {
    var bool = CC["@mozilla.org/supports-PRBool;1"].createInstance(CI.nsISupportsPRBool);
		bool.data = subj;
		var d;
		if (typeof(data) == "string" || typeof(data) == "number") {
      /* it's a number when this._mode is 3rd arg, and FoxyProxy is set to a proxy for all URLs */
	    var	d = CC["@mozilla.org/supports-string;1"].createInstance(CI.nsISupportsString);
			d.data = "" + data; // force to a string
	  }
	  else {
	  	data && (d = data.QueryInterface(CI.nsISupports));
	  }
	  gObsSvc.notifyObservers(bool, topic, d);
};

// load js files
var self;
var fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].getService(CI["nsIFileProtocolHandler"]);
if ("undefined" != typeof(__LOCATION__)) {
  // preferred way
  self = __LOCATION__;
}
else {
  self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
}
var componentDir = self.parent; // the directory this file is in
var settingsDir = componentDir.clone();
settingsDir = settingsDir.parent.parent.parent;
dump("FoxyProxy settingsDir = " + settingsDir.path + "\n");

var loader = CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI["mozIJSSubScriptLoader"]);
loadComponentScript("proxy.js");
loadComponentScript("match.js");
loadModuleScript("superadd.js");

// l is for lulu...
function foxyproxy() {
  try {
    SuperAdd.prototype.fp = gFP = this.wrappedJSObject = this;  
    this._loadStrings();
    this.autoadd = new AutoAdd(this.getMessage("autoadd.pattern.label"));
    this.quickadd = new QuickAdd(this.getMessage("quickadd.pattern.label"));
    LoggEntry.prototype.init();
  }
  catch (e) {
    dumpp(e);
  }  
}
foxyproxy.prototype = {
	PFF : " ",
  _mode : "disabled",
  _selectedProxy : null,
  _selectedTabIndex : 0,
  _proxyDNS : false,
  _toolsMenu : true,
  _contextMenu : true,
  _advancedMenus : false,
  _previousMode : "patterns",
  autoadd : null,
  quickadd : null,
  ips : null,

	QueryInterface: function(aIID) {
		if (!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsIObserver))
			throw CR.NS_ERROR_NO_INTERFACE;
		return this;
	},

	observe: function(subj, topic, data) {
		switch(topic) {
      case "profile-after-change":
        try {
          this.loadSettings();
          this.refreshLocalIPs();     
        }        
        catch (e) {
          dump("observe: " + e + "\n" + e.stack + "\n");
        }   
        break;
			case "app-startup":
				gObsSvc.addObserver(this, "quit-application", false);
				gObsSvc.addObserver(this, "domwindowclosed", false);
        gObsSvc.addObserver(this, "profile-after-change", false);
				//gObsSvc.addObserver(this, "http-on-modify-request", false);
				break;
			case "domwindowclosed":
			  // Did the last browser window close? It could be that the DOM inspector, JS console,
			  // or the non-last browser window just closed. In that case, don't close FoxyProxy.
		    var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
		    var win = wm.getMostRecentWindow("navigator:browser") || wm.getMostRecentWindow("Songbird:Main");
		    if (!win) {
				  this.closeAppWindows("foxyproxy", wm);
				  this.closeAppWindows("foxyproxy-superadd", wm);
				  this.closeAppWindows("foxyproxy-options", wm);
				}
				break;
			case "quit-application": // Called whether or not FoxyProxy options dialog is open when app is closing
			  gObsSvc.removeObserver(this, "quit-application");
			  gObsSvc.removeObserver(this, "domwindowclosed");
        gObsSvc.removeObserver(this, "profile-after-change");
			  break;
			/*case "quit-application-granted":*/ // Not called if FoxyProxy options dialog is open when app is closing
			//case "http-on-modify-request":
				//dump("subj: " + aSubject + "\n");
				//dump("topic: " + aTopic + "\n");
				//dump(" data: " + aData + "\n");
				//var hChannel = subj.QueryInterface(Components.interfaces.nsIHttpChannel);
				//var tab = this.moo(hChannel);
//				if (!tab) dump("tab not found for " + hChannel.name + "\n");
				//dump("tab " + (tab?"found":"not found") + "\n");
				//break;
/* proxy-per-tab ideas:
biesi>	what you could actually do is this:
	<biesi>	observe http-on-modify-request
	<biesi>	there, you can get the notificationCallbacks and the window
	<biesi>	cancel the request if you want a proxy (hopefully that works)
	<biesi>	then, create a new channel for the original URI and post data etc, using nsIProxiedProtocolHandler for the original scheme
biesi>	passing it the appropriate proxyinfo
	<grimholtz>	ok but how does the response get into the right window?
	<biesi>	ah right
	<biesi>	forgot to mention that part
	<biesi>	with help of nsIURILoader::openURI*/

		}
	},

	_loadStrings: function() {
	  var req = CC["@mozilla.org/xmlextras/xmlhttprequest;1"].
	    createInstance(CI.nsIXMLHttpRequest);
	  req.open("GET", "chrome://foxyproxy/content/strings.xml", false);
	  req.send(null);
	  this.strings._entities = [];
	  for (var i=0,e=req.responseXML.getElementsByTagName("i18n"); i<e.length; i++)  {
	    var attrs = e.item(i).attributes;
	    this.strings._entities[attrs.getNamedItem("id").nodeValue] = attrs.getNamedItem("value").nodeValue;
	  }
	},

	closeAppWindows: function(type, wm) {
		var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
		var e = wm.getEnumerator(type);
    while (e.hasMoreElements())
    	e.getNext().close();
	},

  loadSettings : function() {    
    var f = this.getSettingsURI(CI.nsIFile);
    var s = CC["@mozilla.org/network/file-input-stream;1"].createInstance(CI.nsIFileInputStream);
    s.init(f, -1, -1, CI.nsIFileInputStream.CLOSE_ON_EOF);
    var p = CC["@mozilla.org/xmlextras/domparser;1"].createInstance(CI.nsIDOMParser);
    var doc = p.parseFromStream(s, null, f.fileSize, "text/xml");
    if (!doc || doc.documentElement.nodeName == "parsererror") {
      this.alert(null, this.getMessage("settings.error.2", [settingsURI, settingsURI]));
      this.writeSettings(settingsURI);
    }
    else
      this.fromDOM(doc, doc.documentElement);
  },

  refreshLocalIPs : function() {
    this.ips = []; // reset
    var s = CC['@mozilla.org/network/dns-service;1'].getService(CI.nsIDNSService),
      r = s.resolve(s.myHostName, true);
    for (var i=0; r.hasMore() && (this.ips[i] = r.getNextAddrAsString()); i++);
    this.calculateIPFilteredList();    
  },
  
  calculateIPFilteredList : function() {
    this.proxies.calculateIPFilteredList(this.ips);
  },
  
  get mode() { return this._mode; },
  setMode : function(mode, writeSettings, init) {
	  // Possible modes are: patterns, _proxy_id_ (for "Use proxy xyz for all URLs), random, roundrobin, disabled, previous.
    // Note that "previous" isn't used anywhere but this method: it is translated into the previous mode then broadcasted.
    if (mode == "previous") {
      if (this.mode == "disabled")
        mode = this.previousMode;
      else
        mode = "disabled";
    }
    this._previousMode = this._mode;
    this._mode = mode;
	  this._selectedProxy = null; // todo: really shouldn't do this in case something tries to load right after this instruction
    for (var i=0,len=this.proxies.length; i<len; i++) {
      var proxy = this.proxies.item(i);
      if (mode == proxy.id) {
        this._selectedProxy = proxy;
        proxy.enabled = true; // ensure it's enabled
      }
	  	proxy.handleTimer();	// Leave this after "proxy.enabled = true" !
	  	proxy.shouldLoadPAC() && proxy.autoconf.loadPAC();
    }
    this.toggleFilter(mode != "disabled");
    mode=="disabled" && this.loadDefaultPAC();
    if (init) return;
    writeSettings && this.writeSettings();
	  gBroadcast(this.autoadd._enabled, "foxyproxy-mode-change", this._mode);
  },

  loadDefaultPAC : function() {
    // User has disabled FoxyProxy, so Firefox network.proxy.* preferences will be used.
    // If Firefox is configured to use a PAC file, we need to force that PAC file to load.
    // Firefox won't load it automatically except on startup and after
    // network.proxy.autoconfig_retry_* seconds. Rather than make the user wait for that,
    //  we load the PAC file now.
    var networkPrefs = this.getPrefsService("network.proxy."), usingPAC;
    try {
      usingPAC = networkPrefs.getIntPref("type") == 2; // isn't there a const for this?
    }
    catch(e) {
      dump("FoxyProxy: network.proxy.type doesn't exist or can't be read\n");
    }
    if (usingPAC) {
      // Don't use nsPIProtocolProxyService. From its comments: "[nsPIProtocolProxyService] exists purely as a
      // hack to support the configureFromPAC method used by the preference panels in the various apps. Those
      // apps need to be taught to just use the preferences API to "reload" the PAC file. Then, at that point,
      // we can eliminate this interface completely."

      // var pacURL = networkPrefs.getCharPref("autoconfig_url");
      // var pps = CC["@mozilla.org/network/protocol-proxy-service;1"]
        //.getService(Components.interfaces.nsPIProtocolProxyService);
      // pps.configureFromPAC(pacURL);

      // Instead, change the prefs--the proxy service is observing and will reload the PAC
      networkPrefs.setIntPref("type", 1);
      networkPrefs.setIntPref("type", 2);
    }
  },

  /**
   * This assumes mode order is:
   * patterns, proxy1, ..., lastresort, random, roundrobin, disabled
   */
	cycleMode : function() {
		var self=this;
		if (this._selectedProxy && this._selectedProxy.lastresort) {
			this.setMode("disabled", true);
		}
		else if (this._mode == "disabled") {
			this.setMode("patterns", true);
		}
		else if (this._mode == "patterns") {
			var p = this.proxies.item(0);
			(!p || !p.enabled || !p.includeInCycle) && (p = _getNextInCycle(this.proxies.item(0).id));
			this.setMode(p?p.id:"disabled", true);
		}
		else {
			var p = _getNextInCycle(this._mode);
			this.setMode(p?p.id:"disabled", true);
		}
		function _getNextInCycle(start) {
			for (var p=self.proxies.getNextById(start); p && !p.includeInCycle; p = self.proxies.getNextById(p.id));
			return p;
		}
	},

  toggleFilter : function(enabled) {
    var ps = CC["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(CI.nsIProtocolProxyService);
    ps.unregisterFilter(this); // safety - always remove first
    enabled && ps.registerFilter(this, 0);
  },

  applyFilter : function(ps, uri, proxy) {
  	function _err(fp, info, extInfo) {
	  	var def = fp.proxies.item(fp.proxies.length-1);
      mp = gLoggEntryFactory(def, null, spec, "err", extInfo?extInfo:info);
			fp.notifier.alert(info, fp.getMessage("see.log"));
	    return def; // Failsafe: use lastresort proxy if nothing else was chosen
  	}

    try {
      if (uri.scheme == "feed") return; /* feed schemes handled internally by browser */
    	var spec = uri.spec;
      var mp = this.applyMode(spec);
      var ret = mp.proxy.getProxy(spec, uri.host, mp);
      return ret ? ret : _err(this, this.getMessage("route.error"));
    }
    catch (e) {
      dump("applyFilter: " + e + "\n" + e.stack + "\n");
      return _err(this, this.getMessage("route.exception", [""]), this.getMessage("route.exception", [": " + e]));
    }
    finally {
			gObsSvc.notifyObservers(mp.proxy, "foxyproxy-throb", null);
	    this.logg.add(mp);
    }
  },

	getPrefsService : function(str) {
    return CC["@mozilla.org/preferences-service;1"].
      getService(CI.nsIPrefService).getBranch(str);
  },

  // Returns settings URI in desired form
  getSettingsURI : function(type) {
    var o = null;
    try {
      o = this.getPrefsService("extensions.foxyproxy.").getCharPref("settings");
    }
    catch(e) {
      dump("FoxyProxy: Unable to read preference extensions.foxyproxy.settings in getSettingsURI(). Checking for new installation.\n");
      try {
	    // The first time FP runs, "firstrun" does not exist (i.e., null || false). Subsequent times, "firstrun" == true.
	    // In other words, this pref is improperly named for its purpose. Better name is "notfirstrun".      
        var f = this.getPrefsService("extensions.foxyproxy.").getBoolPref("firstrun");
        if (f)
          dump("First run of FoxyProxy\n");          
        else {
          this.alert(null, this.getMessage("preferences.read.error.warning", ["extensions.foxyproxy.settings", "getSettingsURI()"]) + " " + 
            this.getMessage("preferences.read.error.fatal"));
          // TODO: prompt user for path to old file or create new
        }
      }
      catch(ex) {}      
    }
    if (o) {
      o == this.PFF && (o = this.getDefaultPath());
      var file = this.transformer(o, CI.nsIFile);
      // Does it exist?
      if (!file.exists()) {
        this.writeSettings(file);
      }
    }
    else {
      // Default settings file/path
  	  o = this.setSettingsURI(this.getDefaultPath());
    }
    return this.transformer(o, type);
  },

  setSettingsURI : function(o) {
    var o2 = this.transformer(o, "uri-string");
    try {
  	  this.writeSettings(o2);
  	  // Only update the preference if writeSettings() succeeded
      this.getPrefsService("extensions.foxyproxy.").setCharPref("settings", o==this.PFF ? this.PFF : o2);
    }
    catch(e) {
      this.alert(this, this.getMessage("error") + ":\n\n" + e);
    }
    return o==this.PFF ? this.PFF : o2;
  },

  alert : function(wnd, str) {
    CC["@mozilla.org/embedcomp/prompt-service;1"].getService(CI.nsIPromptService)
      .alert(null, this.getMessage("foxyproxy"), str);
  },

  getDefaultPath : function() {
    //var file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
    //var dir = CC["@mozilla.org/file/directory_service;1"].getService(CI.nsIProperties).get("ProfD", CI.nsILocalFile);
    var f = settingsDir.clone();
    f.append("foxyproxy.xml");
    //dump("settings file: " + f.path + "\n");
    return f;
    //file.initWithPath(dir.path);
    //file.appendRelativePath("foxyproxy.xml");
    //return file;
  },

  // Convert |o| from:
  //   - string of the form c:\path\eric.txt
  //   - string of the form file:///c:/path/eric.txt
  //   - nsIFile
  //   - nsIURI
  //   - null: implies use of PFF
  // to any of the other three types. Valid values for |desiredType|:
  //   - "uri-string"
  //   - "file-string"
  //   - Components.interfaces.nsIFile
  //   - Components.interfaces.nsIURI
  transformer : function(o, desiredType) {
    o == this.PFF && (o = this.getDefaultPath());
    const handler = CC["@mozilla.org/network/io-service;1"].
              getService(CI.nsIIOService).getProtocolHandler("file").
              QueryInterface(CI.nsIFileProtocolHandler);
    switch(desiredType) {
      case "uri-string":
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return o;
            return handler.getURLSpecFromFile(this.createFile(o));
          case "object":
            if (o instanceof CI.nsIFile) return handler.getURLSpecFromFile(o);
            if (o instanceof CI.nsIURI) return o.spec;
            return null; // unknown type
        }
      case "file-string":
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return handler.getFileFromURLSpec(o).path;
            return o;
          case "object":
            if (o instanceof CI.nsIFile) return o.path;
            if (o instanceof CI.nsIURI) return handler.getFileFromURLSpec(o.spec).path;
            return null; // unknown type
        }
      case CI.nsIFile:
        switch(typeof(o)) {
          case "string":
			if (o.indexOf("://" > -1)) return handler.getFileFromURLSpec(o);
            return this.createFile(o).path;
          case "object":
            if (o instanceof CI.nsIFile) return o;
            if (o instanceof CI.nsIURI) return handler.getFileFromURLSpec(o.spec);
            return null; // unknown type
        }
      case CI.nsIURI:
        var ios = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService);
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return ios.newURI(o, null, null);
            return handler.newFileURI(this.createFile(o));
          case "object":
            if (o instanceof CI.nsIFile) return handler.newFileURI(o);
            if (o instanceof CI.nsIURI) return o;
            return null; // unknown type
        }
    }

  },

  // Create nsIFile from a string
  createFile : function(str) {
    var f = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
    f.initWithPath(str);
    return f;
  },

  writeSettings : function(o) {
    //try {
      //dump("*** writeSettings\n");
      //throw new Error("e");
    //}
    //catch (e) {catch (e) {dump("*** " + e + " \n\n\n");dump ("\n" + e.stack + "\n");} }    
    if (!o) {
      try {
        o = gFP.getPrefsService("extensions.foxyproxy.").getCharPref("settings");
      }
      catch(e) {
        this.alert(null, this.getMessage("preferences.read.error.warning", ["extensions.foxyproxy.settings", "writeSettings()"]));
        o = this.getDefaultPath();
      }
    }
    try {
      var o2 = gFP.transformer(o, CI.nsIFile);
      var foStream = CC["@mozilla.org/network/file-output-stream;1"].
        createInstance(CI.nsIFileOutputStream);
      foStream.init(o2, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
      foStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", 39);
      CC["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(CI.nsIDOMSerializer)
        .serializeToStream(gFP.toDOM(), foStream, "UTF-8");
      //foStream.write(str, str.length);
      foStream.close();
    }
    catch(ex) {
      dump("*** " + ex + ": " + ex.stack + "\n");
      this.alert(null, this.getMessage("settings.error.3", o instanceof CI.nsIFile ? [o.path] : [o]));
    }
  },

  get proxyDNS() { return this._proxyDNS; },
  set proxyDNS(p) {
    this._proxyDNS = p;
    this.writeSettings();
  },

  get selectedTabIndex() { return this._selectedTabIndex; },
  set selectedTabIndex(i) {
    this._selectedTabIndex = i;
    this.writeSettings();
  },

  get logging() { return this.logg.enabled; },
  set logging(e) {
    this.logg.enabled = e;
    this.writeSettings();
  },

  get toolsMenu() { return this._toolsMenu; },
  set toolsMenu(e) {
    this._toolsMenu = e;
		gBroadcast(e, "foxyproxy-toolsmenu");
    this.writeSettings();
  },

  get contextMenu() { return this._contextMenu; },
  set contextMenu(e) {
    this._contextMenu = e;
		gBroadcast(e, "foxyproxy-contextmenu");
    this.writeSettings();
  },

  get advancedMenus() { return this._advancedMenus; },
  set advancedMenus(i) {
    this._advancedMenus = i;
    this.writeSettings();
  },

  get previousMode() { return this._previousMode; },
  set previousMode(p) {
    this._previousMode = p;
    this.writeSettings();
  },

  /**
   * Return a LoggEntry instance.
   */
  applyMode : function(spec) {
    var loggEntry;
    switch (this.mode) {
      case "random":
				//loggEntry = this.proxies.getRandom(spec, this.random._includeDirect, this.random._includeDisabled);
        //break;
      case "patterns":
	      loggEntry = this.proxies.getMatches(null, spec);
        break;
			case "roundrobin":
				break;
      default:
	      loggEntry = gLoggEntryFactory(this._selectedProxy, null, spec, "ded");
        break;
    }
    return loggEntry;
  },

  restart : function() {
		CC["@mozilla.org/toolkit/app-startup;1"].getService(CI.nsIAppStartup)
	  	.quit(CI.nsIAppStartup.eForceQuit|CI.nsIAppStartup.eRestart);
  },

	fromDOM : function(doc, node) {
		this.statusbar.fromDOM(doc);
		this.toolbar.fromDOM(doc);
		this.logg.fromDOM(doc);
		this._proxyDNS = gGetSafeAttrB(node, "proxyDNS", false);
		this._toolsMenu = gGetSafeAttrB(node, "toolsMenu", true); // new for 2.0
		this._contextMenu = gGetSafeAttrB(node, "contextMenu", true); // new for 2.0
		this._advancedMenus = gGetSafeAttrB(node, "advancedMenus", false); // new for 2.3--default to false if it doesn't exist
		this._selectedTabIndex = gGetSafeAttr(node, "selectedTabIndex", "0");
		var mode = node.hasAttribute("enabledState") ?
			(node.getAttribute("enabledState") == "" ? "disabled" : node.getAttribute("enabledState")) :
			node.getAttribute("mode"); // renamed to mode in 2.0
   	this._previousMode = gGetSafeAttr(node, "previousMode", "patterns");
		this.proxies.fromDOM(mode, doc);
		this.setMode(mode, false, true);
		this.random.fromDOM(doc); 
    this.quickadd.fromDOM(doc); // KEEP THIS BEFORE this.autoadd.fromDOM() else fromDOM() is overwritten!?
    this.autoadd.fromDOM(doc);    
    this.warnings.fromDOM(doc);
	},

	toDOM : function() {
		var doc = CC["@mozilla.org/xml/xml-document;1"].createInstance(CI.nsIDOMDocument);
    var e = doc.createElement("foxyproxy");
    e.setAttribute("mode", this._mode);
    e.setAttribute("selectedTabIndex", this._selectedTabIndex);
    e.setAttribute("proxyDNS", this._proxyDNS);
    e.setAttribute("toolsMenu", this._toolsMenu);
    e.setAttribute("contextMenu", this._contextMenu);
    e.setAttribute("advancedMenus", this._advancedMenus);
    e.setAttribute("previousMode", this._previousMode);
    e.appendChild(this.random.toDOM(doc));
    e.appendChild(this.statusbar.toDOM(doc));
    e.appendChild(this.toolbar.toDOM(doc));
    e.appendChild(this.logg.toDOM(doc));
    e.appendChild(this.warnings.toDOM(doc));
    e.appendChild(this.autoadd.toDOM(doc));
    e.appendChild(this.quickadd.toDOM(doc));
    e.appendChild(this.proxies.toDOM(doc));
    return e;
	},


  ///////////////// random \\\\\\\\\\\\\\\\\\\\\\

	random : {
  	_includeDirect : false,
  	_includeDisabled : false,

	  get includeeDirect() { return this._includeDirect; },
	  set includeeDirect(e) {
	    this._includeDirect = e;
	    gFP.writeSettings();
	  },

	  get includeDisabled() { return this._includeDisabled; },
	  set includeDisabled(e) {
	    this._includeDisabled = e;
	    gFP.writeSettings();
	  },

		toDOM : function(doc) {
			var e = doc.createElement("random");
			e.setAttribute("includeDirect", this._includeDirect);
			e.setAttribute("includeDisabled", this._includeDisabled);
		  return e;
		},

		fromDOM : function(doc) {
      var n = doc.getElementsByTagName("random").item(0);
      this._includeDirect = gGetSafeAttrB(n, "includeDirect", false);
      this._includeDisabled = gGetSafeAttrB(n, "includeDisabled", false);
		}
	},

  ///////////////// proxies \\\\\\\\\\\\\\\\\\\\\\

  proxies : {
    list : [],
    lastresort : null,
    push : function(p) {
      // not really a push: this inserts p
      //as the second-to-last item in the list
      if (this.list.length == 0)
        this.list[0] = p;
      else {
        var len = this.list.length-1;
        this.list[len+1] = this.list[len];
        this.list[len] = p;
	    }
	    return true;
    },

    get length() {
      return this.list.length;
    },

    getProxyById : function(id) {
      var a = this.list.filter(function(e) {return e.id == this;}, id);
      return a?a[0]:null;
    },

    getIndexById : function(id) {
    	var len=this.length;
    	for (var i=0; i<len; i++) {
    		if (this.list[i].id == id) return i;
    	}
    	return -1;
    },

    fromDOM : function(mode, doc) {
      var last = null;
      for (var i=0,proxyElems=doc.getElementsByTagName("proxy"); i<proxyElems.length; i++) {
        var n = proxyElems.item(i);
        n.QueryInterface(CI.nsIDOMElement);
        var p = new Proxy(gFP);
        p.fromDOM(n, mode);  
        if (!last && n.getAttribute("lastresort") == "true")
          last = p;
        else
        	this.list.push(p);
      }
      if (last) {
        this.list.push(last); // ensures it really IS last
        !last.enabled && (last.enabled = true);    // ensure it is enabled
      }
      else {
	      last = new Proxy(gFP);
        last.name = gFP.getMessage("proxy.default");
        last.notes = gFP.getMessage("proxy.default.notes");
        last.mode = "direct";
        last.lastresort = true;
        var match = new Match();
        match.name = gFP.getMessage("proxy.default.match.name");
        match.pattern = "*";
        last.matches.push(match);
        var ippattern = new Match();
        ippattern.name = gFP.getMessage("proxy.default.match.name");
        ippattern.pattern = "*";
        last.ippatterns.push(ippattern);
        last.selectedTabIndex = 0;
        last.animatedIcons = false;
        this.list.push(last); // ensures it really IS last
        gFP.writeSettings();
  		}
  		this.lastresort = last;
    },

    toDOM : function(doc) {
			var proxiesElem=doc.createElement("proxies");
      for (var i=0; i<this.list.length; i++) {
        proxiesElem.appendChild(this.list[i].toDOM(doc));
      }
      return proxiesElem;
    },

    item : function(i) {
      return this.list[i];
    },

    remove : function(idx) {
      this.maintainIntegrity(this.list[idx], true, false, false);
      for (var i=0, temp=[]; i<this.list.length; i++) {
        if (i == idx) {
          if (this.list[i].mode == "auto") // cancel any refresh timers
            this.list[i].autoconf.cancelTimer();
        }
        else
          temp[temp.length] = this.list[i];
      }
      this.list = []; //this.list.splice(0, this.length);
      for (var i=0; i<temp.length; i++) {
	      this.list.push(temp[i]);
	    }
    },

    move : function(idx, direction) {
      var newIdx = idx + (direction=="up"?-1:1);
      if (newIdx < 0 || newIdx > this.list.length-1) return false;
      var temp = this.list[idx];
      this.list[idx] = this.list[newIdx];
      this.list[newIdx] = temp;
      return true;
    },

    getMatches : function(patStr, uriStr) {
			for (var i=0, aMatch; i<this.list.length; i++) {
        var p = this.list[i];
				if (p._enabled && !p.noUseDueToIP && (aMatch = p.isWhiteMatch(patStr, uriStr))) {
					return gLoggEntryFactory(p, aMatch, uriStr, "pat");
				}
      }
      // Failsafe: use lastresort proxy if nothing else was chosen
      return gLoggEntryFactory(this.lastresort, this.lastresort.matches[0], uriStr, "pat");
    },
    
    /**
     * Calculate the list of disabled proxies due to current IP addresses
     */
    calculateIPFilteredList : function(ips) {	
      for (var i=0; i<this.list.length; i++) {
        var p = this.list[i];
        var idx = m(p);
        p.ipMatch = idx == -1 ? null : p.ippatterns[idx];
        p.noUseDueToIP = p.ipMatch == null || p.ipMatch.isBlackList;
        dump("Proxy " + p.name + " has been " + (p.noUseDueToIP ? "disabled" : "enabled") + " and matching ip pattern is " + (p.ipMatch == null ? "null" : p.ipMatch.pattern) + " which is " + (p.ipMatch.isBlackList ? "blacklisted" : "whitelisted") + "\n");
      }
     /**
      * Check if any white patterns already match one of the ips. As a shortcut,
      * we first check if the existing white patterns (as strings) equal |ip|
      * before performing regular expression matches.
      *
      * Black pattern matches take precendence over white pattern matches.
      *
      * Return null if no match. Otherwise, return the matched object. Check
      * the objects |isBlackList| property to determine if the match was black or white.
      */
      function m(proxy) {
      	var idx = -1;
      	for (var i=0,sz=proxy.ippatterns.length; i<sz; i++) {
      	  var m = proxy.ippatterns[i];
      	  if (m.enabled) {
      		for (j in ips) {
      		  var ip = ips[j];
      		  if (m.pattern == ip || m.regex.test(ip)) {
      			if (m.isBlackList) {
      			  // Black takes priority over white
      			  proxy.ipMatch = m;
      			  return i;
      			}
      			else if (idx == -1) {
      			  idx = i; // continue checking for blacklist matches!
      			}
      		  }
      		}
      	  }
      	}
      	return idx;
      }      
    },    

    getRandom : function(uriStr, includeDirect, includeDisabled) {
      var isDirect = true, isDisabled = true, r, cont, maxTries = this.list.length*10;
      do {
        r = Math.floor(Math.random()*this.list.length); // Thanks Andrew @ http://www.shawnolson.net/a/789/
        //dump(r+"\n");
        cont = (!includeDirect && this.list[r].mode == "direct") ||
        	(!includeDisabled && !this.list[r]._enabled);
         //dump("cont="+cont+"\n");
      } while (cont && (--maxTries > 0));
      if (maxTries == 0) {
        return this.lastresort;
      }
      return gLoggEntryFactory(this.list[r], null, uriStr, "rand");
    },

		getNextById : function(curId) {
		  var idx = this.getIndexById(curId);
		  if (idx==-1) return null;
	    for (var i=idx+1,len=this.length; i<len; i++) {
	      if (this.list[i]._enabled) {
	      	return this.list[i];
	      }
	    }
      return null; // at end; do not wrap.
		},

    uniqueRandom : function() {
      var unique = true, r;
      do {
        r = Math.floor(Math.random()*4294967296); // Thanks Andrew @ http://www.shawnolson.net/a/789/
        for (var i=0; i<this.list.length && unique; i++)
          this.list[i].id == r && (unique = false);
      } while (!unique);
      return r;
    },

    maintainIntegrity : function(proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT) {
      var updateViews;
      // Handle foxyproxy "mode"
      if (isBeingDeleted || isBeingDisabled) {
	      if (gFP._mode == proxy.id) {
	      	// Mode is set to "Use proxy ABC for all URLs" and ABC is being deleted/disabled
	        gFP.setMode("disabled", true);
	        updateViews = true;
	      }
	    }
      if (isBeingDeleted) {
        // If the proxy set for "previousMode" is being deleted, change "previousMode"
        if (gFP.previousMode == proxy.id)
          gFP.previousMode = "patterns";
      }

	    // Handle AutoAdd & QuickAdd (superadd)
	    if (gFP.autoadd.maintainIntegrity(proxy.id, isBeingDeleted) && !updateViews) {
	    	updateViews = true;
	    }
	    if (gFP.quickadd.maintainIntegrity(proxy.id, isBeingDeleted) && !updateViews) {
	    	updateViews = true;
	   	}

      // updateViews() with false, false (do not write settings and do not update log view--settings were just written when the properties themselves were updated
      updateViews && gBroadcast(null, "foxyproxy-updateviews");
    }
  },

  ///////////////// logg \\\\\\\\\\\\\\\\\\\\\\\\\\\
  logg : {
    owner : null,
    _maxSize : 500,
    _elements : new Array(this._maxSize),
    _end : 0,
    _start : 0,
    _full : false,
    enabled : false,
    _templateHeader : "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title></title><link rel=\"icon\" href=\"http://foxyproxy.mozdev.org/favicon.ico\"/><link rel=\"shortcut icon\" href=\"http://foxyproxy.mozdev.org/favicon.ico\"/><link rel=\"stylesheet\" href=\"http://foxyproxy.mozdev.org/styles/log.css\" type=\"text/css\"/></head><body><table class=\"log-table\"><thead><tr><td class=\"heading\">${timestamp-heading}</td><td class=\"heading\">${url-heading}</td><td class=\"heading\">${proxy-name-heading}</td><td class=\"heading\">${proxy-notes-heading}</td><td class=\"heading\">${pattern-name-heading}</td><td class=\"heading\">${pattern-heading}</td><td class=\"heading\">${pattern-case-heading}</td><td class=\"heading\">${pattern-type-heading}</td><td class=\"heading\">${pattern-color-heading}</td><td class=\"heading\">${pac-result-heading}</td><td class=\"heading\">${error-msg-heading}</td></tr></thead><tfoot><tr><td/></tr></tfoot><tbody>",
    _templateFooter : "</tbody></table></body></html>",
    _templateRow : "<tr><td class=\"timestamp\">${timestamp}</td><td class=\"url\"><a href=\"${url}\">${url}</a></td><td class=\"proxy-name\">${proxy-name}</td><td class=\"proxy-notes\">${proxy-notes}</td><td class=\"pattern-name\">${pattern-name}</td><td class=\"pattern\">${pattern}</td><td class=\"pattern-case\">${pattern-case}</td><td class=\"pattern-type\">${pattern-type}</td><td class=\"pattern-color\">${pattern-color}</td><td class=\"pac-result\">${pac-result}</td><td class=\"error-msg\">${error-msg}</td></tr>",
    _timeformat : null,
	  _months : null,
	  _days : null,
	  _noURLs : false,
	  noURLsMessage : null,

    fromDOM : function(doc) {
      // init some vars first
	    this._timeformat = gFP.getMessage("timeformat");
	    this.noURLsMessage = gFP.getMessage("log.nourls.url");
			this._months = [gFP.getMessage("months.long.1"), gFP.getMessage("months.long.2"),
		    gFP.getMessage("months.long.3"), gFP.getMessage("months.long.4"), gFP.getMessage("months.long.5"),
		    gFP.getMessage("months.long.6"), gFP.getMessage("months.long.7"), gFP.getMessage("months.long.8"),
		    gFP.getMessage("months.long.9"), gFP.getMessage("months.long.10"), gFP.getMessage("months.long.11"),
		    gFP.getMessage("months.long.12")];
		  this._days = [gFP.getMessage("days.long.1"), gFP.getMessage("days.long.2"),
		    gFP.getMessage("days.long.3"), gFP.getMessage("days.long.4"), gFP.getMessage("days.long.5"),
		    gFP.getMessage("days.long.6"), gFP.getMessage("days.long.7")];

		  // Now deserialize
      var n = doc.getElementsByTagName("logg").item(0);
      this.enabled = gGetSafeAttrB(n, "enabled", false);
      this._maxSize = gGetSafeAttr(n, "maxSize", 500); 
      this._templateHeader = gGetSafeAttr(n, "header-v2", this._templateHeader);
      this._templateFooter = gGetSafeAttr(n, "footer-v2", this._templateFooter);
      this._templateRow = gGetSafeAttr(n, "row-v2", this._templateRow);
      this._noURLs = gGetSafeAttrB(n, "noURLs", false);
	    this.clear();
    },

    toDOM : function(doc) {
      var e = doc.createElement("logg");
      e.setAttribute("enabled", this.enabled);
      e.setAttribute("maxSize", this._maxSize);
      e.setAttribute("noURLs", this._noURLs);
      e.setAttribute("header", this._templateHeader);
      e.setAttribute("row", this._templateRow);
      e.setAttribute("footer", this._templateFooter);
      return e;
    },

    toHTML : function() {
	    // Doing the heading substitution here (over and over again instead of once in fromDOM()) permits users to switch locales w/o having to restart FF and
	    // the changes take effect immediately in FoxyProxy.
	    var self = this, sz = this.length, ret = this._templateHeader.replace(/\${timestamp-heading}|\${url-heading}|\${proxy-name-heading}|\${proxy-notes-heading}|\${pattern-name-heading}|\${pattern-heading}|\${pattern-case-heading}|\${pattern-type-heading}|\${pattern-color-heading}|\${pac-result-heading}|\${error-msg-heading}/gi,
	    	function($0) {
					switch($0) {
						case "${timestamp-heading}": return gFP.getMessage("foxyproxy.tab.logging.timestamp.label");
						case "${url-heading}": return gFP.getMessage("foxyproxy.tab.logging.url.label");
						case "${proxy-name-heading}": return gFP.getMessage("foxyproxy.proxy.name.label");
						case "${proxy-notes-heading}": return gFP.getMessage("foxyproxy.proxy.notes.label");
						case "${pattern-name-heading}": return gFP.getMessage("foxyproxy.pattern.name.label");
						case "${pattern-heading}": return gFP.getMessage("foxyproxy.pattern.label");
            case "${pattern-case-heading}": return gFP.getMessage("foxyproxy.casesensitive.label");
						case "${pattern-type-heading}": return gFP.getMessage("foxyproxy.pattern.type.label");
						case "${pattern-color-heading}": return gFP.getMessage("foxyproxy.whitelist.blacklist.label");
						case "${pac-result-heading}": return gFP.getMessage("foxyproxy.pac.result.label");
						case "${error-msg-heading}": return gFP.getMessage("foxyproxy.error.msg.label");
	    		}
	    	}
	    );
	    function _xmlEncode(str) {
	      return str.replace(/\<|\>|\&|\'|\"/g,
	      	function($0) {
	      	  switch($0) {
	      	    case "<": return "&lt;";
	      	    case ">": return "&gt;";
	      	    case "&": return "&amp;";
	      	    case "'": return "&apos;";
	      	    case "\"": return "&quot;";
	      	  }
	      	}
	      );
	    };
			for (var i=0; i<sz; i++) {
				ret += self._templateRow.replace(/\${timestamp}|\${url}|\${proxy-name}|\${proxy-notes}|\${pattern-name}|\${pattern}|\${pattern-case}|\${pattern-type}|\${pattern-color}|\${pac-result}|\${error-msg}/gi,
					function($0) {
						switch($0) {
							case "${timestamp}": return _xmlEncode(self.format(self.item(i).timestamp));
							case "${url}": return _xmlEncode(self.item(i).uri);
							case "${proxy-name}": return _xmlEncode(self.item(i).proxyName);
							case "${proxy-notes}": return _xmlEncode(self.item(i).proxyNotes);
							case "${pattern-name}": return _xmlEncode(self.item(i).matchName);
							case "${pattern}": return _xmlEncode(self.item(i).matchPattern);
                            case "${pattern-case}": return _xmlEncode(self.item(i).caseSensitive);
							case "${pattern-type}": return _xmlEncode(self.item(i).matchType);
							case "${pattern-color}": return _xmlEncode(self.item(i).whiteBlack);
							case "${pac-result}": return _xmlEncode(self.item(i).pacResult);
							case "${error-msg}": return _xmlEncode(self.item(i).errMsg);
						}
					}
			  );
			}
			return ret + this._templateFooter;
    },

	  // Thanks for the inspiration, Tor2k (http://www.codeproject.com/jscript/dateformat.asp)
	  format : function(d) {
	    d = new Date(d);
	    if (!d.valueOf())
	      return ' ';
			var self = this;
	    return this._timeformat.replace(/yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|zzz|a\/p/gi,
	      function($1) {
	        switch ($1) {
	          case 'yyyy': return d.getFullYear();
	          case 'mmmm': return self._months[d.getMonth()];
	          case 'mmm':  return self._months[d.getMonth()].substr(0, 3);
	          case 'mm':   return zf((d.getMonth() + 1), 2);
	          case 'dddd': return self._days[d.getDay()];
	          case 'ddd':  return self._days[d.getDay()].substr(0, 3);
	          case 'dd':   return zf(d.getDate(), 2);
	          case 'hh':   return zf(((h = d.getHours() % 12) ? h : 12), 2);
	          case 'HH':   return zf(d.getHours(), 2);
	          case 'nn':   return zf(d.getMinutes(), 2);
	          case 'ss':   return zf(d.getSeconds(), 2);
	          case 'zzz':  return zf(d.getSeconds(), 3);
	          case 'a/p':  return d.getHours() < 12 ? 'AM' : 'PM';
	        }
	      }
	    );
		  // My own zero-fill fcn, not Tor 2k's. Assumes (n==2 || n == 3) && c<=n.
		  function zf(c, n) { c=""+c; return c.length == 1 ? (n==2?'0'+c:'00'+c) : (c.length == 2 ? (n==2?c:'0'+c) : c); }
	  },

    get length() {
      var size = 0;
      if (this._end < this._start) {
          size = this._maxSize - this._start + this._end;
      } else if (this._end == this._start) {
         size = (this._full ? this._maxSize : 0);
      } else {
          size = this._end - this._start;
      }
      return size;
    },

    get maxSize() {
      return this._maxSize;
    },

    set maxSize(m) {
      this._maxSize = m;
      this.clear();
     	gFP.writeSettings();
    },

    get noURLs() {
      return this._noURLs;
    },

    set noURLs(m) {
      this._noURLs = m;
     	gFP.writeSettings();
    },

    get templateHeader() {
      return this._templateHeader;
    },

    set templateHeader(t) {
      this._templateHeader = t;
     	gFP.writeSettings();
    },

    get templateFooter() {
      return this._templateFooter;
    },

    set templateFooter(t) {
      this._templateFooter = t;
     	gFP.writeSettings();
    },

    get templateRow() {
      return this._templateRow;
    },

    set templateRow(t) {
      this._templateRow = t;
     	gFP.writeSettings();
    },

    clear : function() {
      this._full = false;
      this._end = this._start = 0;
      //this._elements.forEach(function(element, index, array) {array[index] = null;});
      this._elements = new Array(this._maxSize);
    },

    scrub : function() {
      // Remove sensitive data (urls)
			var self=this;
			this._elements.forEach(function(element, index, array) {array[index].uri = self.noURLsMessage;});
    },

    add : function(o) {
      if (!this.enabled) return;
      this.length == this._maxSize && this._remove();
      this._elements[this._end++] = o;
      this._end >= this._maxSize && (this._end = 0);
      this._end == this._start && (this._full = true);
    },

    item : function(idx) {
      return this.length == 0 ? null : this._elements[idx];
    },

    _remove : function() {
      if (this.length == 0)
        return;
      var element = this._elements[this._start];

      if (element) {
        this._elements[this._start++] = null;
        this._start >= this._maxSize && (this._start = 0);
        this._full = false;
      }
    }
  },

  ///////////////// notifier \\\\\\\\\\\\\\\\\\\\\\\\\\\
  // Thanks for the inspiration: InfoRSS extension (Didier Ernotte, 2005)
  notifier : {
    _queue : [], 
  	alerts : function() {
      try {
        return CC["@mozilla.org/alerts-service;1"].getService(CI.nsIAlertsService);
      }
      catch(e) {return null;}
  	}(),

    alert : function(title, text, noQueue) {
      if (this.alerts)
        this.alerts.showAlertNotification("chrome://foxyproxy/content/images/foxyproxy-nocopy.gif", title, text, false, "", null);
      else {
      	(!this.timer && (this.timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer)));
      	this.timer.cancel();
		    var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
		    var win = wm.getMostRecentWindow("navigator:browser") || wm.getMostRecentWindow("Songbird:Main");
		    try {
			    var doc = win.parent.document;
	        this.tooltip = doc.getElementById("foxyproxy-popup");
	        this._removeChildren(this.tooltip);
	    		var grid = doc.createElement("grid");
	    		grid.setAttribute("flex", "1");
	    		this.tooltip.appendChild(grid);

	    		var columns = doc.createElement("columns");
	    		columns.appendChild(doc.createElement("column"));
	    		grid.appendChild(columns);

	    		var rows = doc.createElement("rows");
	    		grid.appendChild(rows);
	        this._makeHeaderRow(doc, title, rows);
	        this._makeRow(doc, "", rows);
	        this._makeRow(doc, text, rows);
	        this.tooltip.showPopup(doc.getElementById("status-bar"), -1, -1, "tooltip", "topright","bottomright");
					this.timer.initWithCallback(this, 5000, CI.nsITimer.TYPE_ONE_SHOT);
	      }
	      catch (e) {
          /* in case win, win.parent, win.parent.document, tooltip, etc. don't exist */  
          dump("Window not available for user message: " + text + "\n");
          if (!noQueue) {
            dump("Queuing message\n");
            this._queue.push({text:text, title:title});
          }
        }
      }
    },
    
    emptyQueue : function() {
      for (var i=0,sz=this._queue.length; i<sz; i++) {
        var msg = this._queue.pop();
        this.alert(msg.title, msg.text, true);
      } 
    },

    notify : function() {
    	this.tooltip.hidePopup();
    },

    _makeHeaderRow : function(doc, col, gridRows) {
  		var label = doc.createElement("label");
  		label.setAttribute("value", col);
      label.setAttribute("style", "font-weight: bold; text-decoration: underline; color: blue;");
      gridRows.appendChild(label);
    },

    _makeRow : function(doc, col1, gridRows) {
  		var gridRow = doc.createElement("row");
  		var label = doc.createElement("label");
  		label.setAttribute("value", col1);
  		gridRow.appendChild(label);
  		gridRows.appendChild(gridRow);
    },

    _removeChildren : function(node) {
      if (node && node.firstChild) {
        node.removeChild(node.firstChild);
        this._removeChildren(node);
      }
    }
  },

  ///////////////// statusbar \\\\\\\\\\\\\\\\\\\\\
  statusbar : {
    _iconEnabled : true,
    _textEnabled : true,
    _leftClick : "options",
    _middleClick : "cycle",
    _rightClick : "contextmenu",
    _width : 0,

    toDOM : function(doc) {
      var e = doc.createElement("statusbar");
      e.setAttribute("icon", this._iconEnabled); // new for 2.3 (used to be just "enabled")
      e.setAttribute("text", this._textEnabled); // new for 2.3 (used to be just "enabled")
      e.setAttribute("left", this._leftClick); // new for 2.5
	    e.setAttribute("middle", this._middleClick); // new for 2.5
      e.setAttribute("right", this._rightClick); // new for 2.5
      e.setAttribute("width", this._width); // new for 2.6.3
      return e;
    },

    fromDOM : function(doc) {
      var n = doc.getElementsByTagName("statusbar").item(0);
      this._iconEnabled = gGetSafeAttrB(n, "icon", true);
	    this._textEnabled = gGetSafeAttrB(n, "text", true);
	  	this._leftClick = gGetSafeAttr(n, "left", "options");
	  	this._middleClick = gGetSafeAttr(n, "middle", "cycle");
	  	this._rightClick = gGetSafeAttr(n, "right", "contextmenu");
      this._width = gGetSafeAttr(n, "width", 0);      
    },

    get iconEnabled() { return this._iconEnabled; },
    set iconEnabled(e) {
      this._iconEnabled = e;
      gFP.writeSettings();
			gBroadcast(e, "foxyproxy-statusbar-icon");
      e && gFP.setMode(gFP.mode, false, false); // todo: why is this here? can it be removed? it forces PAC to reload
    },

    get textEnabled() { return this._textEnabled; },
    set textEnabled(e) {
      this._textEnabled = e;
      gFP.writeSettings();
			gBroadcast(e, "foxyproxy-statusbar-text");
      e && gFP.setMode(gFP.mode, false, false);  // todo: why is this here? can it be removed? it forces PAC to reload
    },

    get leftClick() { return this._leftClick; },
    set leftClick(e) {
      this._leftClick = e;
      gFP.writeSettings();
    },

    get middleClick() { return this._middleClick; },
    set middleClick(e) {
      this._middleClick = e;
      gFP.writeSettings();
    },

    get rightClick() { return this._rightClick; },
    set rightClick(e) {
      this._rightClick = e;
      gFP.writeSettings();
    },
    
    get width() { return this._width; },
    set width(e) {
      e = parseInt(e);
      if (isNaN(e)) e = 0;
      this._width = e;
      gFP.writeSettings();
      gBroadcast(e, "foxyproxy-statusbar-width");
    }
  },

  ///////////////// toolbar \\\\\\\\\\\\\\\\\\\\\
  toolbar : {
    _leftClick : "options",
    _middleClick : "cycle",
    _rightClick : "contextmenu",

    toDOM : function(doc) {
      var e = doc.createElement("toolbar");
			e.setAttribute("left", this._leftClick); // new for 2.5
			e.setAttribute("middle", this._middleClick); // new for 2.5
			e.setAttribute("right", this._rightClick); // new for 2.5
      return e;
    },

    fromDOM : function(doc) {
      var n = doc.getElementsByTagName("toolbar").item(0);
	  	this._leftClick = gGetSafeAttr(n, "left", "options");
	  	this._middleClick = gGetSafeAttr(n, "middle", "cycle");
	  	this._rightClick = gGetSafeAttr(n, "right", "contextmenu");
    },

    get leftClick() { return this._leftClick; },
    set leftClick(e) {
      this._leftClick = e;
      gFP.writeSettings();
    },

    get middleClick() { return this._middleClick; },
    set middleClick(e) {
      this._middleClick = e;
      gFP.writeSettings();
    },

    get rightClick() { return this._rightClick; },
    set rightClick(e) {
      this._rightClick = e;
      gFP.writeSettings();
    }
  },

  ///////////////// strings \\\\\\\\\\\\\\\\\\\\\
  getMessage : function(msg, ar) {
    try {
      return this.strings.getMessage(msg, ar);
    }
    catch (e) {
      dump("getMessage: " + e + "\n");
      this.alert(null, "Error reading string resource: " + msg); // Do not localize!
    }
  },

  strings : {
    _sbs : CC["@mozilla.org/intl/stringbundle;1"]
      .getService(CI.nsIStringBundleService)
      .createBundle("chrome://foxyproxy/locale/foxyproxy.properties"),
    _entities : null,

    getMessage : function(msg, ar) {
      return ar ? this._sbs.formatStringFromName(msg, ar, ar.length) :
        (this._entities[msg] ? this._entities[msg] : this._sbs.GetStringFromName(msg));
    }
  },

  warnings : {
	  _noWildcards : false,
    get noWildcards() { return this._noWildcards; },
    set noWildcards(e) {
      this._noWildcards = e;
      gFP.writeSettings();
    },

    toDOM : function(doc) {
      var e = doc.createElement("warnings"); // new for 2.3
      e.setAttribute("no-wildcards", this._noWildcards);
      return e;
    },

    fromDOM : function(doc) {
      var n = doc.getElementsByTagName("warnings").item(0);
      this._noWildcards = gGetSafeAttrB(n, "no-wildcards", false);
    }
  },
  classID: Components.ID("{46466e13-16ab-4565-9924-20aac4d98c82}"),
  contractID: "@leahscape.org/foxyproxy/service;1",
  classDescription: "FoxyProxy Core"
};

///////////////////////////// LoggEntry class ///////////////////////
function LoggEntry(proxy, aMatch, uriStr, type, errMsg) {
    this.timestamp = Date.now();
    this.uri = uriStr;
    this.proxy = proxy;
    this.proxyName = proxy.name; // Make local copy so logg history doesn't change if user changes proxy    
    this.proxyNotes = proxy.notes;  // ""
    if (type == "pat") {
      this.matchName = aMatch.name;  // Make local copy so logg history doesn't change if user changes proxy
      this.matchPattern = aMatch.pattern; // ""
      this.matchType = aMatch.isRegEx ? this.regExMsg : this.wcMsg;  
      this.whiteBlack = aMatch.isBlackList ? this.blackMsg : this.whiteMsg; // ""
      this.caseSensitive = aMatch.caseSensitive ? this.yes : this.no; // ""
    }
    else if (type == "ded") {
      this.caseSensitive = this.whiteBlack = this.matchName = this.matchPattern = this.matchType = this.allMsg;
    }   
    else if (type == "rand") {
      this.matchName = this.matchPattern = this.matchType = this.whiteBlack = this.randomMsg;
    }
    else if (type == "round") {
    }
    else if (type == "err") {
      this.errMsg = errMsg;
    }
}

LoggEntry.prototype = {
  errMsg : "", // Default value for MPs which don't have errors
  pacResult : "", // Default value for MPs which don't have PAC results (i.e., they probably don't use PACs or the PAC returned null
  init : function() { /* one-time init to get localized msgs */
    this.randomMsg = gFP.getMessage("proxy.random");
    this.allMsg = gFP.getMessage("proxy.all.urls");
    this.regExMsg = gFP.getMessage("foxyproxy.regex.label");
    this.wcMsg = gFP.getMessage("foxyproxy.wildcard.label");
    this.blackMsg = gFP.getMessage("foxyproxy.blacklist.label");
    this.whiteMsg = gFP.getMessage("foxyproxy.whitelist.label");
    this.yes = gFP.getMessage("yes");  
    this.no = gFP.getMessage("no");    
  }
};


var gXpComObjects = [foxyproxy];
var gCatObserverName = "foxyproxy_catobserver";
var gCatContractId = foxyproxy.prototype.contractID;


function NSGetModule(compMgr, fileSpec) {
  gModule._catObserverName = gCatObserverName;
  gModule._catContractId = gCatContractId;

  for (var i in gXpComObjects)
    gModule._xpComObjects[i] = new gFactoryHolder(gXpComObjects[i]);

  return gModule;
}

function gFactoryHolder(aObj) {
  this.singleton = null;
  this.CID        = aObj.prototype.classID;
  this.contractID = aObj.prototype.contractID;
  this.className  = aObj.prototype.classDescription;
  this.factory =
  {
    createInstance: function(aOuter, aIID)
    {
      if (aOuter)
        throw CR.NS_ERROR_NO_AGGREGATION;
      if (!this.singleton)
        this.singleton = new this.constructor; 
      return this.singleton.QueryInterface(aIID);
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
  },

  unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {
    var catman = CC["@mozilla.org/categorymanager;1"].getService(CI.nsICategoryManager);
    catman.deleteCategoryEntry("app-startup", this._catObserverName, true);

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