/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
dump("superadd.js\n");
const DEF_PATTERN = "*://${3}${6}/*";

function SuperAdd() {
  this.match = new Match();
  this.match.isMultiLine = true;
}
// todo: AutoAdd needs caseSensitive
function QuickAdd() { SuperAdd.apply(this, arguments); }

// The super class definition. QuickAdd is a subclass of SuperAdd.
SuperAdd.prototype = {
  fp : null,
  _reload : true,
  _enabled : false,
  _temp : false, // new for 2.8
  _proxy : null,
  _notify : true,
  _notifyWhenCanceled : true,
  _prompt : false,
  match : null,
  elemName : "autoadd",
  elemNameCamelCase : "AutoAdd",
  notificationTitle : "foxyproxy.tab.autoadd.label",
  
  _urlTemplate : DEF_PATTERN,  
  _formatConverter : CC["@mozilla.org/widget/htmlformatconverter;1"].createInstance(CI.nsIFormatConverter),

  setName : function(matchName) {
		this.match.name = matchName;  
  },
    
  get enabled() { return this._enabled; },
  set enabled(e) {
    this._enabled = e;
    this.fp.writeSettings();
    this.elemName == "autoadd" && gBroadcast(e, "foxyproxy-autoadd-toggle");
  },

  get temp() { return this._temp; },
  set temp(t) {
    this._temp = t;
    this.fp.writeSettings();
  },
  
  get urlTemplate() { return this._urlTemplate; },
  set urlTemplate(u) {
    this._urlTemplate = u.replace(/^\s*|\s*$/g,"");
    this.fp.writeSettings();
  },    

  get reload() { return this._reload; },
  set reload(e) {
    this._reload = e;
    this.fp.writeSettings();
  },    

  get proxy() { return this._proxy; },
  set proxy(p) {
    this._proxy = p;
    this.fp.writeSettings();
  },
  
  set proxyById(id) {
    // Call |set proxy(p) {}|
    dump("proxyById\n");
    this.proxy = this.fp.proxies.getProxyById(id);
  },

  get notify() { return this._notify; },
  set notify(n) {
    this._notify = n;
    this.fp.writeSettings();
  },

  get notifyWhenCanceled() { return this._notifyWhenCanceled; },
  set notifyWhenCanceled(n) {
    this._notifyWhenCanceled = n;
    this.fp.writeSettings();
  },
  
  get prompt() { return this._prompt; },
  set prompt(n) {
    this._prompt = n;
    this.fp.writeSettings();
  },  
  

  /**
   * Update the list of menuitems in |menu|
   */
  updateProxyMenu : function(menu, doc) {
    if (!this._enabled) return;
    var popup=menu.firstChild, fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
    fpc.removeChildren(popup);
    for (var i=0,p; i<this.fp.proxies.length && ((p=this.fp.proxies.item(i)) || 1); i++) {
      if (!p.lastresort && p.enabled) {
        popup.appendChild(fpc.createMenuItem({idVal:p.id, labelVal:p.name, type:"radio", name:"foxyproxy-enabled-type",
          document:doc}));
        //popup.appendChild(fpc.createMenuItem({idVal:"disabled", labelId:"mode.disabled.label"}));
      }
    }
    function selFirst() {
      // select the first one
      if (popup.firstChild && popup.firstChild.id)
        this.proxyById = menu.value = popup.firstChild.id;
    }

    if (this._proxy)
      menu.value = this.proxy.id;
    else
      selFirst();
    //menu.selectedIndex == -1 && selFirst();
  },  
  
  perform : function(url, content) {
    dump("this.match.pattern=" + this.match.pattern + "\n");
    if (this.match.pattern != "") {
    	// Does this URL already match an existing pattern for a proxy?
    	var p = this.fp.proxies.getMatches(url).proxy;
      if (p.lastresort) { // no current proxies match (except the lastresort, which matches everything anyway)
        if (this.match.pattern.regex.test(stripTags(content))) {
        	//return this.addPattern(this.match, url);
          var fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
          this.match.pattern = fpc.applyTemplate(url, this._urlTemplate, this.match.caseSensitive);
          this._proxy.matches.push(this.match);      
          this._notify && this.fp.notifier.alert(this.fp.getMessage(this.notificationTitle), this.fp.getMessage("superadd.url.added", [this.match.pattern, this._proxy.name]));
          return this.match.pattern;          
        }
      }
    }
    function stripTags(txt) {
      var oldStr = CC["@mozilla.org/supports-string;1"].createInstance(CI.nsISupportsString);
      oldStr.data = txt;
      var newStr = {value: null};
      try {
          this._formatConverter.convert("text/html", oldStr, oldStr.toString().length,
            "text/unicode", newStr, {});
          return newStr.value.QueryInterface(CI.nsISupportsString).toString();
      }
      catch (e) {
          return oldStr.toString();
      }
    }
  }, 
    
  addPattern : function(m) {
	  this._proxy.matches.push(m);      
  },
  
  allowed : function() {
    for (var i=0,p; i<this.fp.proxies.length && (p=this.fp.proxies.item(i)); i++)
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
    e.setAttribute("enabled", this._enabled);
    e.setAttribute("temp", this._temp);    
    e.setAttribute("urlTemplate", this._urlTemplate);
    e.setAttribute("reload", this._reload);			
    e.setAttribute("notify", this._notify);
    e.setAttribute("notifyWhenCanceled", this._notifyWhenCanceled);
    e.setAttribute("prompt", this._prompt);    
    this._proxy && e.setAttribute("proxy-id", this._proxy.id);
    if (!this.match.temp) e.appendChild(this.match.toDOM(doc));
    return e;
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName(this.elemName).item(0);
    this._enabled = gGetSafeAttrB(n, "enabled", false);
    this._temp = gGetSafeAttrB(n, "temp", false);
    this._urlTemplate = gGetSafeAttr(n, "urlTemplate", DEF_PATTERN);
    if (this._urlTemplate == "") this._urlTemplate = DEF_PATTERN;      
    this._reload = gGetSafeAttrB(n, "reload", true);    
    this._notify = gGetSafeAttrB(n, "notify", true);
    this._notifyWhenCanceled = gGetSafeAttrB(n, "notifyWhenCanceled", true);
    this._prompt = gGetSafeAttrB(n, "prompt", false);
    var proxyId = gGetSafeAttr(n, "proxy-id", null);
    if (n) this.match.fromDOM(n.getElementsByTagName("match").item(0));
    if (!this.match.name || this.match.name == "") this.match.name = this.fp.getMessage("foxyproxy.autoadd.pattern.label");
    this.match.isMultiLine = true; 
    var error;
    if (proxyId) {
      // Ensure it exists and is enabled and isn't "direct"
      this._proxy = this.fp.proxies.getProxyById(proxyId);
      this._enabled && (!this._proxy || !this._proxy.enabled) && (error = true);
    }
    else if (this._enabled)
      error = true;
    if (error) {
      this._enabled = false;
      this.fp.alert(null, this.fp.getMessage("superadd.error", [this.elemName]));
    }    
  }    
};
// Next line must come *after* SuperAdd.prototype definition
QuickAdd.prototype = new SuperAdd();
// These are subclass-specific additions and overrides
QuickAdd.prototype.notificationTitle = "foxyproxy.quickadd.label";
QuickAdd.prototype.elemName = "quickadd";
QuickAdd.prototype.elemNameCamelCase = "QuickAdd";
