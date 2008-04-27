/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
var CI = Components.interfaces, CC = Components.classes, gFP;
const DEF_PATTERN = "*://${3}${6}/*";

function SuperAdd() {}
function QuickAdd() { SuperAdd.apply(this, arguments); }

// The super class definition. QuickAdd is a subclass of SuperAdd.
SuperAdd.prototype = {
  owner : null,
  _reload : true,
  _enabled : false,
  _proxy : null,
  _notify : true,
  _prompt : false,
  match : null,
  elemName : "autoadd",
  elemNameCamelCase : "AutoAdd",
  notificationTitle : "foxyproxy.tab.autoadd.label",
  
  _urlTemplate : DEF_PATTERN,
  _ios : CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService),

  init : function(matchName, fp) {
  	gFP = fp;	    
		this.match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
		this.match.isMultiLine = true;
		this.match.name = matchName;  
  },
    
  get enabled() { return this._enabled; },
  set enabled(e) {
    this._enabled = e;
    gFP.writeSettings();
    this.elemName == "autoadd" && gBroadcast(e, "foxyproxy-autoadd-toggle");
  },

  get urlTemplate() { return this._urlTemplate; },
  set urlTemplate(u) {
    this._urlTemplate = u.replace(/^\s*|\s*$/g,"");
    gFP.writeSettings();
  },    

  get reload() { return this._reload; },
  set reload(e) {
    this._reload = e;
    gFP.writeSettings();
  },    

  get proxy() { return this._proxy; },
  set proxy(p) {
    this._proxy = p;
    gFP.writeSettings();
  },    

  get notify() { return this._notify; },
  set notify(n) {
    this._notify = n;
    gFP.writeSettings();
  },

  get prompt() { return this._prompt; },
  set prompt(n) {
    this._prompt = n;
    gFP.writeSettings();
  },  
  
  // As of 2.7.3, this fcn is stateless
  perform : function(url, content) {
    if (this.match.pattern != "") {
    	// Does this URL already match an existing pattern for a proxy?
    	var p = gFP.proxies.getMatches(url).proxy;
      if (p.lastresort) { // no current proxies match (except the lastresort, which matches everything anyway)
        if (this.match.pattern.regex.test(content))
        	return this.addPattern(this.match, url);
      }
    }
  }, 
  
  addPattern : function(match, url) {
	  match.pattern = foxyproxy_common.applyTemplate(url, this._urlTemplate, this.match.caseSensitive);
	  this._proxy.matches.push(match);      
    this._notify && gFP.notifier.alert(gFP.getMessage(this.notificationTitle), gFP.getMessage("superadd.url.added", [match.pattern, this._proxy.name]));
    return match.pattern;
  },
  
  allowed : function() {
    for (var i=0,p; i<gFP.proxies.length && (p=gFP.proxies.item(i)); i++)
      if (p.enabled && !p.lastresort)
        return true;
    return false;
  },

	// Disable superadd if our proxy is being deleted/disabled
	maintainIntegrity : function(proxyId, isBeingDeleted) {
		if (this._proxy && this._proxy.id == proxyId) {
		  // Turn it off
		  this.enabled && (this.enabled = false);
		  if (isBeingDeleted) {
		  	// Clear it
		    this.proxy = null;	
		  }
		  return true;
		}
		return false;
	},
	  
  toDOM : function(doc) {
    var e = doc.createElement(this.elemName);
    e.setAttribute("enabled", this.enabled);
    e.setAttribute("urlTemplate", this._urlTemplate);
    e.setAttribute("reload", this._reload);			
    e.setAttribute("notify", this._notify);
    e.setAttribute("prompt", this._prompt);    
    this._proxy && e.setAttribute("proxy-id", this._proxy.id);
    e.appendChild(this.match.toDOM(doc));
    return e;
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName(this.elemName)[0];
    var proxyId;
    if (n) {
      this._enabled = gGetSafeAttrB(n, "enabled", false);
      this._urlTemplate = gGetSafeAttr(n, "urlTemplate", DEF_PATTERN);
      if (this._urlTemplate == "") this._urlTemplate = DEF_PATTERN;      
      this._reload = gGetSafeAttrB(n, "reload", true);    
      this._notify = gGetSafeAttrB(n, "notify", true);
      this._prompt = gGetSafeAttrB(n, "prompt", false);
      proxyId = gGetSafeAttr(n, "proxy-id", null);
      this.match.fromDOM(n.getElementsByTagName("match")[0]);   
      (!this.match.name || this.match.name == "") && (this.match.name = gFP.getMessage("foxyproxy.autoadd.pattern.label"));
      this.match.isMultiLine = true;        
    }
    var error;
    if (proxyId) {
      // Ensure it exists and is enabled and isn't "direct"
      this._proxy = gFP.proxies.getProxyById(proxyId);
      this._enabled && (!this._proxy || !this._proxy.enabled) && (error = true);
    }
    else if (this._enabled)
      error = true;
    if (error) {
      this._enabled = false;
      gFP.alert(null, gFP.getMessage("superadd.error", [this.elemName]));
    }    
  }    
};
// Next line must come *after* SuperAdd.prototype definition
QuickAdd.prototype = new SuperAdd();
// These are subclass-specific additions and overrides
QuickAdd.prototype.notificationTitle = "foxyproxy.quickadd.label";
QuickAdd.prototype.elemName = "quickadd";
QuickAdd.prototype.elemNameCamelCase = "QuickAdd";
QuickAdd.prototype._notifyWhenCanceled = true;
QuickAdd.prototype.__defineGetter__("notifyWhenCanceled", function() { return this._notifyWhenCanceled; })
QuickAdd.prototype.__defineSetter__("notifyWhenCanceled", function(n) {
	this._notifyWhenCanceled = n;
	gFP.writeSettings();
});
QuickAdd.prototype.toDOM = function(doc) {
	var e = SuperAdd.prototype.toDOM.apply(this, arguments);
	e.setAttribute("notifyWhenCanceled", this._notifyWhenCanceled);
	return e;
}
QuickAdd.prototype.fromDOM = function(doc) {
	var e = SuperAdd.prototype.fromDOM.apply(this, arguments);
  var n = doc.getElementsByTagName(this.elemName)[0];	
  if (n) {
   this._notifyWhenCanceled = n.hasAttribute("notifyWhenCanceled") ?
		n.getAttribute("notifyWhenCanceled") == "true" : true;
	}
}