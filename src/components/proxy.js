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

var CI = Components.interfaces, CC = Components.classes, CR = Components.results,
  FEED_URL = "feed://";
var fp = null;
var proxyService = CC["@mozilla.org/network/protocol-proxy-service;1"].getService(CI.nsIProtocolProxyService);
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

var self;
var fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].createInstance(CI["nsIFileProtocolHandler"]);
if ("undefined" != typeof(__LOCATION__)) {
  // preferred way
  self = __LOCATION__;
}
else {
  self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
}
var dir = self.parent; // the directory this file is in
var loader = CC["@mozilla.org/moz/jssubscript-loader;1"].createInstance(CI["mozIJSSubScriptLoader"]);
try {
  var filePath = dir.clone();
  filePath.append("autoconf.js");
  loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
	filePath = dir.clone();
  filePath.append("manualconf.js");
  loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
	filePath = dir.clone();
  filePath.append("match.js");
  loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
}
catch (e) {
  dump("Error loading autoconf.js, manualconf.js, or match.js\n");
  throw(e);
}
///////////////////////////// Proxy class ///////////////////////
function Proxy() {
  this.wrappedJSObject = this;
  !fp &&
  	(fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject);
  this.matches = new Array();
  this.name = this.notes = "";
  this.manualconf = new ManualConf();
  this.autoconf = new AutoConf(this, null);
  this._mode = "manual"; // manual, auto, direct, random
  this._enabled = true;
  this.selectedTabIndex = 0;
  this.lastresort = false;
  this.id = fp.proxies.uniqueRandom();
}

Proxy.prototype = {
  QueryInterface: gQueryInterface,
  direct: proxyService.newProxyInfo("direct", "", -1, 0, 0, null),
  animatedIcons: true,
  includeInCycle: true,

  fromDOM : function(node, fpMode) {
    this.name = node.getAttribute("name");
    this.id = node.getAttribute("id") || fp.proxies.uniqueRandom();
    this.notes = node.getAttribute("notes");
    this._enabled = node.getAttribute("enabled") == "true";
    this.autoconf.fromDOM(node.getElementsByTagName("autoconf")[0]);
    this.manualconf.fromDOM(node.getElementsByTagName("manualconf")[0]);
    // 1.1 used "manual" instead of "mode" and was true/false only (for manual or auto)
    this._mode = node.hasAttribute("manual") ?
  	  (node.getAttribute("manual") == "true" ? "manual" : "auto") :
    	node.getAttribute("mode");
	  this._mode = this._mode || "manual";
    this.selectedTabIndex = node.getAttribute("selectedTabIndex") || "0";
	  this.lastresort = node.hasAttribute("lastresort") ? node.getAttribute("lastresort") == "true" : false; // new for 2.0
    this.animatedIcons = node.hasAttribute("animatedIcons") ? node.getAttribute("animatedIcons") == "true" : !this.lastresort; // new for 2.4
    this.includeInCycle = node.hasAttribute("includeInCycle") ? node.getAttribute("includeInCycle") == "true" : !this.lastresort; // new for 2.5
    for (var i=0,temp=node.getElementsByTagName("match"); i<temp.length; i++) {
      var j = this.matches.length;
      this.matches[j] = new Match();
      this.matches[j].fromDOM(temp[i]);
    }
		this.afterPropertiesSet(fpMode);
  },

  toDOM : function(doc) {
    var e = doc.createElement("proxy");
    e.setAttribute("name", this.name);
    e.setAttribute("id", this.id);
    e.setAttribute("notes", this.notes);
    e.setAttribute("enabled", this.enabled);
    e.setAttribute("mode", this.mode);
    e.setAttribute("selectedTabIndex", this.selectedTabIndex);
    e.setAttribute("lastresort", this.lastresort);
    e.setAttribute("animatedIcons", this.animatedIcons);
    e.setAttribute("includeInCycle", this.includeInCycle);

    var matchesElem = doc.createElement("matches");
    e.appendChild(matchesElem);
    for (var j=0,n; j<this.matches.length; j++) {
      n = this.matches[j].toDOM(doc);
      if (n)
        matchesElem.appendChild(n);
    }
    e.appendChild(this.autoconf.toDOM(doc));
    e.appendChild(this.manualconf.toDOM(doc));
    return e;
  },

  set enabled(e) {
    if (this.lastresort && !e) return; // can't ever disable this guy
    this._enabled = e;
		this.shouldLoadPAC() && this.autoconf.loadPAC();
    this.handleTimer();
  },

  get enabled() {return this._enabled;},

	shouldLoadPAC:function() {
    return this._mode == "auto" &&
	  	(fp.mode == this.id || fp.mode == "patterns" || fp.mode == "random" || fp.mode == "roundrobin") && this._enabled;
	},

  set mode(m) {
    this._mode = m;
    this.shouldLoadPAC() && this.autoconf.loadPAC();
    this.handleTimer();
  },

	afterPropertiesSet : function(fpMode) {
	  // Load PAC if required. Note that loadPAC() is synchronous and if it fails, it changes our mode to "direct" or disables us.
    this.shouldLoadPAC() && this.autoconf.loadPAC();

   	// Some integrity maintenance: if this is a manual proxy and this.manualconf.proxy wasn't created during deserialization, disable us.
    if (this._enabled && this._mode == "manual" && !this.manualconf.proxy) {
      if (this.lastresort) {
     	  // Switch lastresort to DIRECT since manualconf is corrupt--someone changed foxyproxy.xml manually, outside our GUI
     	  this._mode = "direct";
      }
      else
     	  this._enabled = false;
    }
	  !this._enabled &&
	 	  fp.proxies.maintainIntegrity(this, false, true, false); // (proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT)
	},

	handleTimer : function() {
		var ac = this.autoconf;
		ac.timer.cancel(); // always always always cancel first before doing anything
		if (this.shouldLoadPAC() && ac._autoReload) {
			ac.timer.initWithCallback(ac, ac._reloadFreqMins*60000, CI.nsITimer.TYPE_REPEATING_SLACK);
		}
	},

  get mode() {return this._mode;},

  isWhiteMatch : function(uriStr) {
    var white = -1;
    for (var i=0,sz=this.matches.length; i<sz; i++) {
      if (this.matches[i].enabled && this.matches[i].regex.test(uriStr)) {
        if (this.matches[i].isBlackList) {
          return false;
        }
        else if (white == -1) {
          white = i; // continue checking for blacklist matches!
        }
      }
    }
    return white == -1 ? false : this.matches[white];
  },

  isBlackMatch : function(uriStr) {
    for (var i=0,sz=this.matches.length; i<sz; i++) {
      var m = this.matches[i];
      if (m.enabled && m.isBlackList && m.regex.test(uriStr))
        return m;
    }
  },

  removeMatch : function(removeMe) {
    this.matches = this.matches.filter(function(e) {return e != removeMe;});
  },

	resolve : function(spec, host, mp) {

	  function _notifyUserOfError(spec) {
			this.pacErrorNotification && fp.notifier.alert(fp.getMessage("foxyproxy"), fp.getMessage("proxy.error.for.url") + spec);
			return null;
		}
	  // See http://wp.netscape.com/eng/mozilla/2.0/relnotes/demo/proxy-live.html
	  var str = mp.pacResult = this.autoconf._resolver.getProxyForURI(spec, host);
	  if (str && str != "") {
	    str = str.toLowerCase();
	    var tokens = str.split(/\s*;\s*/), // Trim and split
      	proxies = [];
	    if (tokens[tokens.length-1] == "") // In case final token ends with semi-colon
	      tokens.length--;
	    for (var i=0; i<tokens.length; i++) {
	      var components = this.autoconf.parser.exec(tokens[i]);
	      if (!components) continue;
	      switch (components[1]) {
	        case "proxy":
	          proxies.push(proxyService.newProxyInfo("http", components[2], components[3], 0, 0, null));
	          break;
	        case "socks":
	        case "socks5":
	          proxies.push(proxyService.newProxyInfo("socks", components[2], components[3],
	            fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
	          break;
	        case "socks4":
	          proxies.push(proxyService.newProxyInfo("socks4", components[2], components[3],
	            fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
	          break;
	        case "direct":
	          proxies.push(this.direct);
	          break;
	        default:
	          return this._notifyUserOfError(spec);
	      }
	    }
	    // Chain the proxies
	    for (var i=1; i<=proxies.length-1; i++) {
	      proxies[i-1].failoverTimeout = 1800;
	      proxies[i-1].failoverProxy = proxies[i];
	    }
	    if (proxies[0] == null) {
		    return this._notifyUserOfError(spec);
		  }
		  else if (proxies[1]) {
			  proxies[0].failoverTimeout = 1800;
			  proxies[0].failoverProxy = proxies[1];
		  }
	    return proxies[0];
	  }
	  else {
	    // Resolver did not find a proxy, but this isn't an error condition
	    return null;
	  }
	},

  getProxy : function(spec, host, mp) {
    switch (this._mode) {
      case "manual":return this.manualconf.proxy;
      case "auto":return this.resolve(spec, host, mp);
	    case "direct":return this.direct;
    }
  },
	classID: Components.ID("{51b469a0-edc1-11da-8ad9-0800200c9a66}"),
	contractID: "@leahscape.org/foxyproxy/proxy;1",
	classDescription: "FoxyProxy Proxy Component"
};

var gXpComObjects = [Proxy];
var gCatObserverName = "foxyproxy_proxy_catobserver";
var gCatContractId = Proxy.prototype.contractID;

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
	},

	unregisterSelf: function(aCompMgr, aFileSpec, aLocation) {

		aComponentManager.QueryInterface(CI.nsIComponentRegistrar);
		for (var key in this._xpComObjects)
		{
			var obj = this._xpComObjects[key];
			aComponentManager.unregisterFactoryLocation(obj.CID, aFileSpec);
		}
	},

	getClassObject: function(aComponentManager, aCID, aIID)	{
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
