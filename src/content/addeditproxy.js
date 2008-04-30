/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
const CI = Components.interfaces, CC = Components.classes;
var urlsTree, proxy, foxyproxy, autoconfurl, overlay, isWindows, fpc;

function onLoad() {
  isWindows = CC["@mozilla.org/xre/app-info;1"].getService(CI.nsIXULRuntime).OS == "WINNT";
  fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  overlay = fpc.getMostRecentWindow().foxyproxy;
  autoconfurl = document.getElementById("autoconfurl");
  foxyproxy = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
  if (window.arguments[0].inn.torwiz) {
    document.getElementById("torwiz-broadcaster").hidden = true;
    document.getElementById("not-torwiz-broadcaster").hidden = false;
    urlsTree = document.getElementById("torWizUrlsTree");
  }
  else
    urlsTree = document.getElementById("urlsTree");

  proxy = window.arguments[0].inn.proxy;
  document.getElementById("proxyname").value = proxy.name;
  document.getElementById("proxynotes").value = proxy.notes;
  document.getElementById("animatedIcons").checked = proxy.animatedIcons;
  document.getElementById("cycleEnabled").checked = proxy.includeInCycle;
  document.getElementById("tabs").selectedIndex = proxy.selectedTabIndex;
  document.getElementById("proxyenabled").checked = proxy.enabled;
  document.getElementById("mode").value = proxy.mode;
  toggleMode(proxy.mode);
  document.getElementById("host").value = proxy.manualconf.host;
  document.getElementById("port").value = proxy.manualconf.port;
  document.getElementById("isSocks").checked = proxy.manualconf.isSocks;
	onIsSocks(proxy.mode == "manual" && proxy.manualconf.isSocks);
  document.getElementById("socksversion").value = proxy.manualconf.socksversion;
  autoconfurl.value = proxy.autoconf.url;

  if (proxy.lastresort) {
    document.getElementById("default-proxy-broadcaster").setAttribute("disabled", "true");
	  document.getElementById("proxyname").disabled =
	  	document.getElementById("proxynotes").disabled = true;
    document.getElementById("patternstab").hidden = true;
  }
  document.getElementById("pacLoadNotificationEnabled").checked = proxy.autoconf.loadNotification;
  document.getElementById("pacErrorNotificationEnabled").checked = proxy.autoconf.errorNotification;
  document.getElementById("autoConfURLReloadEnabled").checked = proxy.autoconf.autoReload;
  document.getElementById("autoConfReloadFreq").value = proxy.autoconf.reloadFreqMins;

  _updateView();
  sizeToContent();
}

function trim(s) {
	return s.replace(/^\s*|\s*$/g, "");
}

function onOK() {
  var name = trim(document.getElementById("proxyname").value);
  if (!name) {
    foxyproxy.alert(this, foxyproxy.getMessage("proxy.name.required"));
    return false;
  }
  var enabled = document.getElementById("proxyenabled").checked,
    host = trim(document.getElementById("host").value),
    port = document.getElementById("port").value,
    url = trim(autoconfurl.value),
    reloadfreq = document.getElementById("autoConfReloadFreq").value;
  var mode = document.getElementById("mode").value;
  if (enabled) {
    if (mode == "auto") {
	    if (!_checkUri())
	    	return false;
    }
    else if (mode == "manual") {
    	if (!host) {
    		if (!port) {
			    foxyproxy.alert(this, foxyproxy.getMessage("nohostport"));
			    return false;
    		}
		    foxyproxy.alert(this, foxyproxy.getMessage("nohost2"));
		    return false;
    	}
    	else if (!port) {
		    foxyproxy.alert(this, foxyproxy.getMessage("noport2"));
		    return false;
		  }
		}
  }

	if (!hasWhite() &&
		!overlay.ask(this, foxyproxy.getMessage((window.arguments[0].inn.torwiz ? "torwiz.nopatterns.2" : "no.white.patterns.2")))) return false;

  proxy.name = name;
  proxy.notes = document.getElementById("proxynotes").value;
  proxy.selectedTabIndex = document.getElementById("tabs").selectedIndex;
  proxy.autoconf.url = url;
  proxy.autoconf.loadNotification = document.getElementById("pacLoadNotificationEnabled").checked;
  proxy.autoconf.errorNotification = document.getElementById("pacErrorNotificationEnabled").checked;
	proxy.autoconf.autoReload = document.getElementById("autoConfURLReloadEnabled").checked;
	proxy.autoconf.reloadFreqMins = reloadfreq;

  proxy.mode = mode; // set this first to control PAC loading
  proxy.enabled = enabled;
  proxy.manualconf.host = host;
  proxy.manualconf.port = port;
  proxy.manualconf.isSocks = document.getElementById("isSocks").checked;
  proxy.manualconf.socksversion = document.getElementById("socksversion").value;
  proxy.animatedIcons = document.getElementById("animatedIcons").checked;
  proxy.includeInCycle = document.getElementById("cycleEnabled").checked;
  proxy.afterPropertiesSet();

  window.arguments[0].out = {proxy:proxy};
  return true;
}

function hasWhite() {
  return proxy.matches.some(function(m){return m.enabled && !m.isBlackList;});
}

function _checkUri() {
	var url = trim(autoconfurl.value);
	if (url.indexOf("://") == -1) {
		// User didn't specify a scheme, so assume he means file:///
		url = url.replace(/\\/g,"/"); // replaces backslashes with forward slashes; probably not strictly necessary
		if (url[0] != "\\" && url[0] != "/") url="/"+url; // prepend a leading slash if necessary
		url="file:///" + (isWindows?"C:":"") + url;
		autoconfurl.value = url; // copy back to the UI
	}
	try {
    //return foxyproxy.newURI(url);
    return CC["@mozilla.org/network/io-service;1"]
      .getService(CI.nsIIOService).newURI(url, "UTF-8", null);
  }
  catch(e) {
    foxyproxy.alert(this, foxyproxy.getMessage("invalid.url"));
    return false;
  }
}

function onAddEdit(isNew) {
  var idx = urlsTree.currentIndex;
  if (!isNew && idx == -1) return; // safety; may not be necessary anymore

  var m = proxy.matches[idx];
  var params = isNew ?
    {inn:{name:"", pattern:"", regex:false, black:false, enabled:true, temp:false}, out:null} :
		{inn:{name:m.name,
			    pattern:m.pattern, regex:m.isRegEx,
			    black:m.isBlackList,
			    enabled:m.enabled,
          caseSensitive:m.caseSensitive,
          temp:m.temp}, out:null};

  window.openDialog("chrome://foxyproxy/content/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out) {
    params = params.out;
    var match = isNew ? CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject : m;    
    match.name = params.name;
    match.pattern = params.pattern;
    match.isRegEx = params.isRegEx;
    match.isBlackList = params.isBlackList;
    match.enabled = params.isEnabled;
    match.caseSensitive = params.caseSensitive;
    match.temp = match.temp;
    
   if (isNew)
     proxy.matches.push(match);
	    
   _updateView();
  	// Select item
	urlsTree.view.selection.select(isNew?urlsTree.view.rowCount-1 : urlsTree.currentIndex);
  }
}

function setButtons() {
  document.getElementById("tree-row-selected").setAttribute("disabled", urlsTree.currentIndex == -1);
  onAutoConfUrlInput();
}

function _updateView() {
  // Redraw the tree
  urlsTree.view = {
    rowCount : proxy.matches.length,
    getCellText : function(row, column) {
      var s = column.id ? column.id : column;
      switch(s) {
        case "nameCol":return proxy.matches[row].name;
        case "patternCol":return proxy.matches[row].pattern;
        case "patternTypeCol":return foxyproxy.getMessage(proxy.matches[row].isRegEx ? "foxyproxy.regex.label" : "foxyproxy.wildcard.label");
        case "blackCol":return foxyproxy.getMessage(proxy.matches[row].isBlackList ? "foxyproxy.blacklist.label" : "foxyproxy.whitelist.label");
        case "caseSensitiveCol":return foxyproxy.getMessage(proxy.matches[row].caseSensitive ? "yes" : "no");
        case "tempCol":return foxyproxy.getMessage(proxy.matches[row].temp ? "yes" : "no");
      }
    },
    setCellValue: function(row, col, val) {proxy.matches[row].enabled = val;},
    getCellValue: function(row, col) {return proxy.matches[row].enabled;},
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isEditable: function(row, col) { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {return null;},
    getProgressMode: function(aRow, aColumn) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(aRow, aColumn, aProperty) {},
    getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
    getCellProperties: function(aRow, aProperty) {},
    getLevel: function(row){ return 0; }

  };
  setButtons();
}

function onRemove() {
  // Store cur selection
  var sel = urlsTree.currentIndex;
  proxy.removeMatch(proxy.matches[sel]);
  _updateView();
  // Reselect the next appropriate item
	urlsTree.view.selection.select(sel+1>urlsTree.view.rowCount ? urlsTree.view.rowCount-1:sel);
}

function toggleMode(mode) {
  // Next line--buggy in FF 1.5.0.1--makes fields enabled but readonly
  // document.getElementById("disabled-broadcaster").setAttribute("disabled", mode == "auto" ? "true" : "false");
  // Call removeAttribute() instead of setAttribute("disabled", "false") or setAttribute("disabled", false);
  // Thanks, Andy McDonald.
  if (mode == "auto") {
    document.getElementById("autoconf-broadcaster1").removeAttribute("disabled");
		document.getElementById("disabled-broadcaster").setAttribute("disabled", "true");
		onAutoConfUrlInput();
  }
  else if (mode == "direct") {
    document.getElementById("disabled-broadcaster").setAttribute("disabled", "true");
		document.getElementById("autoconf-broadcaster1").setAttribute("disabled", "true");
  }
  else {
    document.getElementById("disabled-broadcaster").removeAttribute("disabled");
    document.getElementById("autoconf-broadcaster1").setAttribute("disabled", "true");
  }
}

function onHelp() {
  fpc.openAndReuseOneTabPerURL("http://foxyproxy.mozdev.org/patterns.html");
}

function onViewAutoConf() {
  var w, p = _checkUri();
	p &&
		(w=open("view-source:" + p.spec, "", "scrollbars,resizable,modal,chrome,dialog=no,width=450,height=425").focus());
  w && (w.windowtype="foxyproxy-options"); // set windowtype so it's forced to close when last browser closes
}

function onTestAutoConf() {
	if (_checkUri()) {
		var autoConf = CC["@leahscape.org/foxyproxy/autoconf;1"].createInstance(CI.nsISupports).wrappedJSObject;
		autoConf.owner = {name: "Test", enabled: true};
		autoConf.url = autoconfurl.value;
    autoConf._resolver = CC["@mozilla.org/network/proxy-auto-config;1"].createInstance(CI.nsIProxyAutoConfig);
    autoConf.loadPAC();
    var none=foxyproxy.getMessage("none");
    foxyproxy.alert(this, autoConf.owner.enabled ?
    	foxyproxy.getMessage("autoconfurl.test.success") :
    	foxyproxy.getMessage("autoconfurl.test.fail", [autoConf.status, autoConf.error?autoConf.error:none]));
	}
}

function onAutoConfUrlInput() {
  // setAttribute("disabled", true) buggy in FF 1.5.0.4 for the way i've setup the cmd
  // so must use removeAttribute()
	var b = document.getElementById("autoconf-broadcaster2");
  if (autoconfurl.value.length > 0)
    b.removeAttribute("disabled");
  else
    b.setAttribute("disabled", "true");
}

function onSelectAutoConf() {
  const nsIFilePicker = CI.nsIFilePicker;
  var p = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  p.init(window, foxyproxy.getMessage("pac.select"), nsIFilePicker.modeOpen);
  p.appendFilters(nsIFilePicker.filterAll);
  p.appendFilter(foxyproxy.getMessage("pac.files"), "*.pac");
  p.defaultExtension = "pac";
  if (p.show() != nsIFilePicker.returnCancel) {
  	autoconfurl.value = foxyproxy.transformer(p.file, "uri-string");
  	onAutoConfUrlInput();
  }
}

function onUrlsTreeMenuPopupShowing() {
	document.getElementById("enabledPopUpMenuItem").setAttribute("checked", proxy.matches[urlsTree.currentIndex].enabled);
}

function toggleEnabled() {
	proxy.matches[urlsTree.currentIndex].enabled = !proxy.matches[urlsTree.currentIndex].enabled;
  _updateView();
}

function onWildcardReference() {
	document.getElementById('wildcardReferencePopup').showPopup(document.getElementById('wildcardRefBtn'), -1, -1, 'popup', 'bottomleft', 'topleft');
}

function onIsSocks(checked) {
	document.getElementById("socks5").disabled = document.getElementById("socks4").disabled = !checked;
}