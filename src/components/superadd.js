/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

/**

This is the super class for AutoAdd and QuickAdd classes.

AutoAdd and QuickAdd both have their own instance of a Match object in their .match property. It is used for storing a template
of the Match object to be added to a proxy dynamically:
  .name - User-supplied name of the pattern. "Dynamic QuickAdd/AutoAdd Pattern" by default
  .pattern - A string template, applied to the URL at the time of addition of a dynamic Match object to the SuperAdd object.
    It is *://${3}${6}/* by default.
  .caseSensitive - whether or not the expanded (post-applyTemplate()) .pattern should be compared to URLs case-sensitively
  .temp - not used; SuperAdd.temp is used instead since match.temp isn't serialized/deserialized to/from DOM 
  .type - whether or not the expanded (post-applyTemplate()) .pattern is black or white list
  .isRegExp - whether or not the expanded (post-applyTemplate()) .pattern is a regexp or a wildcard pattern
  .enabled - always true. doesn't make sense to dynamically add a disabled pattern.
  .isMultiLine - whether or not .pattern should be searched single or multiline. always false in this context.

blockedPageMatch - a Match object specific to AutoAdd only. Only four of the properties are relavent:
  .pattern - A string wildcard or regexp expression of the pattern that marks a page as blocked.
    *Corporate policy prevents access* by default.
  .caseSensitive - whether or not .pattern should be tested against input pages case-sensitively.
  .isRegExp - whether or not .pattern is a regexp or a wildcard pattern
  .isMultiLine - whether or not .pattern should be tested against single or multi-line. Always true in this context.
  .name, .enabled, .temp, .isBlackList - not used in this context
*/
dump("superadd.js\n");
const DEF_PATTERN = "*://${3}${6}/*";
function SuperAdd() {}

function QuickAdd(mName) {
  dump("quick add ctor\n");
  SuperAdd.apply(this, arguments);
  this.match = new Match(true, mName, DEF_PATTERN);
  this.notificationTitle = "foxyproxy.quickadd.label";
  this.elemName = "quickadd";
  this.elemNameCamelCase = "QuickAdd";
}
function AutoAdd(mName) {
  SuperAdd.apply(this, arguments);
  this.match = new Match(true, mName, DEF_PATTERN);  
  this._blockedPageMatch = new Match(true, "", this.fp.getMessage("not.authorized"), false, false, false, false, true);    
  this.notificationTitle = "foxyproxy.tab.autoadd.label";
  this.elemName = "autoadd";
  this.elemNameCamelCase = "AutoAdd";
  // Override the setter for this.blockedPageMatch.pattern to change empty and null
  // patterns to the default pattern
  this._blockedPageMatch.__defineSetter__("pattern", function(p) {
    if (!p) p = ""; // prevent null patterns
    this._pattern = p.replace(/^\s*|\s*$/g,""); // trim
    if (this._pattern == "")
      this._pattern = this.fp.getMessage("not.authorized");    
    this.buildRegEx();
  });
  // Strangely, if we override the setter with __defineSetter__, the getter is reset.
  // So we have to forcefully set it again...
  this._blockedPageMatch.__defineGetter__("pattern", function() { return this._pattern; });
}

// The super class definition
SuperAdd.prototype = {
  fp : null,
  _reload : true,
  _enabled : false,
  _temp : false, // new for 2.8. Whether or not the expanded (post-applyTemplate()) .pattern is permanent or temporary.
  _proxy : null,
  _notify : true,
  _notifyWhenCanceled : true,
  _prompt : false,
  match : null,
  
  _formatConverter : CC["@mozilla.org/widget/htmlformatconverter;1"].createInstance(CI.nsIFormatConverter),
    
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
    // Select the appropriate one or, if none was previously selected, select the first
    if (this._proxy) {
      menu.value = this.proxy.id;
      // Selected proxy no longer exists; select the first one
      if (menu.selectedIndex == -1)
        this.proxyById = menu.value = popup.firstChild.id;
    }
    else {
      // Select the first one
      this.proxyById = menu.value = popup.firstChild.id;
    }
  },  
  
  /**
   * todo: define this fcn only for autoadd
   */
  perform : function(url, content) {
    if (this.match.pattern != "") {
    	// Does this URL already match an existing pattern for a proxy?
    	var p = this.fp.proxies.getMatches(url).proxy;
      if (p.lastresort) { // no current proxies match (except the lastresort, which matches everything anyway)
        if (this._blockedPageMatch.regex.test(content)) {
        	//return this.addPattern(this.match, url);
          var fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
          this.match.pattern = fpc.applyTemplate(url, this._blockedPageMatch.pattern, this._blockedPageMatch.caseSensitive);
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
    
  /** Push a Match object onto our proxy's match list */
  addPattern : function(m) {
    this._proxy.matches.push(m);
    this._notify && this.fp.notifier.alert(this.fp.getMessage(this.notificationTitle),
      fp.getMessage("superadd.url.added", [m.pattern, this._proxy.name]));
  },

  allowed : function() {
    for (var i=0,p; i<this.fp.proxies.length && (p = this.fp.proxies.item(i)); i++)
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
    e.setAttribute("reload", this._reload);			
    e.setAttribute("notify", this._notify);
    e.setAttribute("notifyWhenCanceled", this._notifyWhenCanceled);
    e.setAttribute("prompt", this._prompt);    
    this._proxy && e.setAttribute("proxy-id", this._proxy.id);
    e.appendChild(this.match.toDOM(doc));
    return e;
  },
  
  fromDOM : function(doc) {
    dump("base fromDOM for " + this.elemName + "\n");
    var n = doc.getElementsByTagName(this.elemName).item(0);
    this._enabled = gGetSafeAttrB(n, "enabled", false);
    dump("this._enabled = " + this._enabled + "\n");
    this._temp = gGetSafeAttrB(n, "temp", false);     
    this._reload = gGetSafeAttrB(n, "reload", true);    
    this._notify = gGetSafeAttrB(n, "notify", true);
    this._notifyWhenCanceled = gGetSafeAttrB(n, "notifyWhenCanceled", true);
    this._prompt = gGetSafeAttrB(n, "prompt", false);
    var proxyId = gGetSafeAttr(n, "proxy-id", null);
    if (n) this.match.fromDOM(n.getElementsByTagName("match").item(0));
    this.match.isMultiLine = false; 
    var error;
    if (proxyId) {
      // Ensure the proxy still  exists
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
// Next two lines must come *after* SuperAdd.prototype definition
QuickAdd.prototype = new SuperAdd();
AutoAdd.prototype = new SuperAdd();
AutoAdd.prototype.__defineGetter__("blockedPageMatch", function() { return this._blockedPageMatch; });
AutoAdd.prototype.__defineSetter__("blockedPageMatch", function(m) {
  this._blockedPageMatch = m;
  this.fp.writeSettings();
});
AutoAdd.prototype.toDOM = function(doc) {
  var e = SuperAdd.prototype.toDOM.apply(this, arguments);
  e.appendChild(this._blockedPageMatch.toDOM(doc));
  return e;
};
AutoAdd.prototype.fromDOM = function(doc) {
  dump("overriden fromDOM\n");
  SuperAdd.prototype.fromDOM.apply(this, arguments);
  // new sXPathEvaluator() is not yet available.
  var xpe = CC["@mozilla.org/dom/xpath-evaluator;1"].getService(CI.nsIDOMXPathEvaluator);
  var nsResolver = xpe.createNSResolver(doc);  
  // Note XPath expression array index is 1-based.
  var n = xpe.evaluate("/foxyproxy/autoadd/match[2]", doc, nsResolver, xpe.FIRST_ORDERED_NODE_TYPE , null);  
  if (n == null) {
    // TODO: handle pre-2.8 installations
    dump("upgrade to 2.8?\n");
  }
  else 
    this._blockedPageMatch.fromDOM(n.singleNodeValue);
};
