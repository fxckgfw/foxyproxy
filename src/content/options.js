/*
  FoxyProxy
  Copyright (C) 2006, 2007 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This library is free software; you can redistribute it and/or modify it
  under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation; either version 2.1 of the License, or (at
  your option) any later version.

  This library is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  FITNESSFOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License
  for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with this library; if not, write to the Free Software Foundation,
  Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

  ALL RIGHTS RESERVED. U.S. PATENT PENDING.
*/
var foxyproxy, proxySettingsTree, logTree, monthslong, dayslong, overlay,
	quickAddTemplateExample, autoAddTemplateExample, timeformat, saveLogCmd, noURLsCmd,
	common, prevMode;
const CI = Components.interfaces, CC = Components.classes;

function onLoad() {
  foxyproxy = CC["@leahscape.org/foxyproxy/service;1"]
    .getService(CI.nsISupports).wrappedJSObject;
  document.getElementById("maxSize").value = foxyproxy.logg.maxSize;    
  overlay = CC["@mozilla.org/appshell/window-mediator;1"]
    .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy;    
	common=overlay.common;
  monthslong = [foxyproxy.getMessage("months.long.1"), foxyproxy.getMessage("months.long.2"),
    foxyproxy.getMessage("months.long.3"), foxyproxy.getMessage("months.long.4"), foxyproxy.getMessage("months.long.5"),
    foxyproxy.getMessage("months.long.6"), foxyproxy.getMessage("months.long.7"), foxyproxy.getMessage("months.long.8"),
    foxyproxy.getMessage("months.long.9"), foxyproxy.getMessage("months.long.10"), foxyproxy.getMessage("months.long.11"),
    foxyproxy.getMessage("months.long.12")];
  
  dayslong = [foxyproxy.getMessage("days.long.1"), foxyproxy.getMessage("days.long.2"),
    foxyproxy.getMessage("days.long.3"), foxyproxy.getMessage("days.long.4"), foxyproxy.getMessage("days.long.5"),
    foxyproxy.getMessage("days.long.6"), foxyproxy.getMessage("days.long.7")];
  proxySettingsTree = document.getElementById("proxySettingsTree");
  logTree = document.getElementById("logTree");
  autoAddTemplateExample = document.getElementById("autoAddTemplateExample");
  quickAddTemplateExample = document.getElementById("quickAddTemplateExample");
  saveLogCmd = document.getElementById("saveLogCmd");
  clearLogCmd = document.getElementById("clearLogCmd");  
  noURLsCmd = document.getElementById("noURLsCmd");  
  timeformat = foxyproxy.getMessage("timeformat");
  _initSettings();
}

function _initSettings() {
  _updateView(false, true);
  document.getElementById("settingsURL").value = foxyproxy.getSettingsURI("uri-string"); 
  document.getElementById("tabs").selectedIndex = foxyproxy.selectedTabIndex;
  document.getElementById("autoAddUrlTemplate").value = foxyproxy.autoadd.urlTemplate; 
  document.getElementById("autoAddPattern").value = foxyproxy.autoadd.match.pattern;   
  document.getElementById("quickAddUrlTemplate").value = foxyproxy.quickadd.urlTemplate;  
  document.getElementById("autoAddMatchType").value = foxyproxy.autoadd.match.isRegEx ? "r" : "w"; 
  document.getElementById("quickAddMatchType").value = foxyproxy.quickadd.match.isRegEx ? "r" : "w"; 
  updateTemplateExample("autoAddUrlTemplate", "autoAddTemplateExample", foxyproxy.autoadd);  
  updateTemplateExample("quickAddUrlTemplate", "quickAddTemplateExample", foxyproxy.quickadd);  
  prevMode = document.getElementById("modeMenu").value;
}

function onUsingPFF(usingPFF) {
  document.getElementById("settingsURLBtn").disabled = usingPFF;
	foxyproxy.setSettingsURI(usingPFF?foxyproxy.PFF:foxyproxy.getDefaultPath());
  _initSettings();  
}

function _updateLogView() {
	saveLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);
	clearLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);	
  noURLsCmd.setAttribute("checked", foxyproxy.logg.noURLs); 
  logTree.view = {
    rowCount : foxyproxy.logg.length,
    getCellText : function(row, column) {
      var mp = foxyproxy.logg.item(row);
      if (!mp) return;
      switch(column.id) {
        case "timeCol":return format(mp.timestamp);
        case "urlCol":return mp.uri;
        case "nameCol":return mp.proxyName;
        case "notesCol":return mp.proxyNotes;
        case "mpNameCol":return mp.matchName;
        case "mpCol":return mp.matchPattern;        
        case "mpTypeCol":return mp.matchType;
        case "mpBlackCol":return mp.whiteBlack;       
        case "pacResult":return mp.pacResult;
        case "errCol":return mp.errMsg;
      }
    },
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isEditable: function(row, col) { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {return null;},
    getProgressMode: function(aRow, aColumn) {},
    getCellValue: function(row, col) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(row, col, props) {
      /*if (foxyproxy.logg.item(row) && foxyproxy.logg.item(row).matchPattern == NA) {      
	  	  var a = Components.classes["@mozilla.org/atom-service;1"].
		      getService(Components.interfaces.nsIAtomService);
		    col.AppendElement(a.getAtom("grey"));
	    }*/
    },
    getColumnProperties: function(aColumn, aColumnElement, props) {},
    getCellProperties: function(aRow, props) {},
    getLevel: function(row){ return 0; }
  };
}

  // Thanks for the inspiration, Tor2k (http://www.codeproject.com/jscript/dateformat.asp)
  function format(d) {
    d = new Date(d);
    if (!d.valueOf())
      return '&nbsp;';

    return timeformat.replace(/(yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|zzz|a\/p)/gi,
      function($1) {
        switch ($1) {
          case 'yyyy': return d.getFullYear();
          case 'mmmm': return monthslong[d.getMonth()];
          case 'mmm':  return monthslong[d.getMonth()].substr(0, 3);
          case 'mm':   return zf((d.getMonth() + 1), 2);
          case 'dddd': return dayslong[d.getDay()];
          case 'ddd':  return dayslong[d.getDay()].substr(0, 3);
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
  }
  
// My own zero-fill fcn, not Tor 2k's. Assumes (n==2 || n == 3) && c<=n.
function zf(c, n) { c=""+c; return c.length == 1 ? (n==2?'0'+c:'00'+c) : (c.length == 2 ? (n==2?c:'0'+c) : c); }

function _updateModeMenu() {
	var menu = document.getElementById("modeMenu");	
	var popup=menu.firstChild;
	common.removeChildren(popup);
	
  popup.appendChild(common.createMenuItem({idVal:"patterns", labelId:"mode.patterns.label"}));
  for (var i=0,p; i<foxyproxy.proxies.length && ((p=foxyproxy.proxies.item(i)) || 1); i++)
    popup.appendChild(common.createMenuItem({idVal:p.id, labelId:"mode.custom.label", labelArgs:[p.name], type:"radio", name:"foxyproxy-enabled-type"}));
    //popup.appendChild(common.createMenuItem({idVal["random", labelId:"mode.random.label"}));
  popup.appendChild(common.createMenuItem({idVal:"disabled", labelId:"mode.disabled.label"}));
  menu.value = foxyproxy.mode;
	var igble = document.getElementById("ignoreBlackListEnabled");
	igble.hidden = true;
  if (foxyproxy.mode != "patterns" && foxyproxy.mode != "disabled" &&
  	foxyproxy.mode != "random") {
  	// Mode: Use proxy "ABC" for all URLs or default proxy settings
  	if (!foxyproxy._selectedProxy.lastresort) {
  		igble.hidden = false;
  		igble.checked = foxyproxy._selectedProxy.ignoreBlackList;
  	}
	  if (!foxyproxy.proxies.item(menu.selectedIndex-1).enabled) { // subtract 1 because first element, patterns, is not in the proxies array
  	  // User disabled or deleted the proxy; select default setting.
    	foxyproxy.setMode("disabled", true);
	    menu.value = "disabled";
  	}
  }
}

function onSettingsURLBtn() {
  const nsIFilePicker = CI.nsIFilePicker;
  var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, foxyproxy.getMessage("file.select"), nsIFilePicker.modeSave);
  fp.defaultString = "foxyproxy.xml";
  fp.appendFilters(nsIFilePicker.filterAll|nsIFilePicker.filterXML);
  if (fp.show() != nsIFilePicker.returnCancel) {
  	foxyproxy.setSettingsURI(fp.file);
    _initSettings();
  }
}

/* Contains items which can be updated via toolbar/statusbar/menubar/context-menu as well as the options dialog,
	 so we don't include these in onLoad() or init() */
function _updateView(writeSettings, updateLogView) {
  document.getElementById("dnsEnabled").checked = foxyproxy.proxyDNS;
  document.getElementById("enableLogging").checked = foxyproxy.logging;
  //document.getElementById("randomIncludeDirect").checked = foxyproxy.random.includeDirect;
  //document.getElementById("randomIncludeDisabled").checked = foxyproxy.random.includeDisabled;
  document.getElementById("usingPFF").checked =
    document.getElementById("settingsURLBtn").disabled = foxyproxy.isUsingPFF();
    
  _updateSuperAdd(foxyproxy.autoadd, "auto");
  _updateSuperAdd(foxyproxy.quickadd, "quick");  
  
  function _updateSuperAdd(saObj, str) {
	  var temp = saObj.enabled;
	  document.getElementById(str + "AddEnabled").checked = temp;
	  document.getElementById(str + "AddBroadcaster").hidden = !temp;
	  document.getElementById(str + "AddReload").checked = saObj.reload;
	  document.getElementById(str + "AddNotify").checked = saObj.notify;  
  }  
  // quick-add-specific stuff
  document.getElementById("quickAddPrompt").checked = foxyproxy.quickadd.prompt;  
  document.getElementById("quickAddNotifyWhenCanceled").checked = foxyproxy.quickadd.notifyWhenCanceled;   
  
  document.getElementById("toolsMenuEnabled").checked = foxyproxy.toolsMenu;
  document.getElementById("contextMenuEnabled").checked = foxyproxy.contextMenu;
  document.getElementById("statusbarIconEnabled").checked = foxyproxy.statusbar.iconEnabled;
  document.getElementById("statusbarTextEnabled").checked = foxyproxy.statusbar.textEnabled;   
  document.getElementById("advancedMenusEnabled").checked = foxyproxy.advancedMenus;      

  document.getElementById("sbLeftClickMenu").value = foxyproxy.statusbar.leftClick;        
  document.getElementById("sbMiddleClickMenu").value = foxyproxy.statusbar.middleClick;          
  document.getElementById("sbRightClickMenu").value = foxyproxy.statusbar.rightClick;            

  document.getElementById("tbLeftClickMenu").value = foxyproxy.toolbar.leftClick;        
  document.getElementById("tbMiddleClickMenu").value = foxyproxy.toolbar.middleClick;          
  document.getElementById("tbRightClickMenu").value = foxyproxy.toolbar.rightClick;            
    
	_updateModeMenu();
  
  var menu = document.getElementById("autoAddProxyMenu");
  common.updateSuperAddProxyMenu(foxyproxy.autoadd, menu, onAutoAddProxyChanged);
  if (!menu.firstChild.firstChild) {
 		document.getElementById("autoAddEnabled").checked = false;
 		onAutoAddEnabled(false);
 	}

  menu = document.getElementById("quickAddProxyMenu");
  common.updateSuperAddProxyMenu(foxyproxy.quickadd, menu, common.onQuickAddProxyChanged);
  if (!menu.firstChild.firstChild) {
 		document.getElementById("quickAddEnabled").checked = false;
 		onQuickAddEnabled(false);
 	}
    
  proxySettingsTree.view  = {
    rowCount : foxyproxy.proxies.length,
    getCellText : function(row, column) {
      var i = foxyproxy.proxies.item(row);    
      switch(column.id) {
        case "nameCol":return i.name;
        case "descriptionCol":return i.notes;   
        case "modeCol":return foxyproxy.getMessage(i.mode);
        case "hostCol":return i.manualconf.host;           
        case "isSocksCol":return i.manualconf.isSocks?foxyproxy.getMessage("yes"):foxyproxy.getMessage("no");        
        case "portCol":return i.manualconf.port;                   
        case "socksverCol":return i.manualconf.socksversion == "5" ? "5" : "4/4a";                           
        case "autopacCol":return i.autoconf.url;   
        case "animatedIconsCol":return i.animatedIcons?foxyproxy.getMessage("yes"):foxyproxy.getMessage("no");
        case "cycleCol":return i.includeInCycle?foxyproxy.getMessage("yes"):foxyproxy.getMessage("no");
      }
    },
    setCellValue: function(row, col, val) {foxyproxy.proxies.item(row).enabled = val;},
    getCellValue: function(row, col) {return foxyproxy.proxies.item(row).enabled;},    
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
  writeSettings && foxyproxy.writeSettings();
  setButtons();
  updateLogView && _updateLogView();
}

function onEnableTypeChanged(menu) {
	var mode = menu.value, res, propFcn;
	if (mode == prevMode)
		return;
  switch (mode) {
    case "random":  
     	res = "mode.random";
     	propFcn = function() {foxyproxy.warning.modeRandom=true;};
     	break; 
    case "patterns":
     	res = "mode.patterns";
     	propFcn = function() {foxyproxy.warning.modePatterns=true;};    
      break;
		case "roundrobin":    
     	res = "mode.roundrobin";
     	propFcn = function() {foxyproxy.warning.modeRoundRobin=true;};		     
			break;
		case "disabled":
     	res = "mode.disabled";
     	propFcn = function() {foxyproxy.warning.modeDisabled=true;};		
			break;
    default:  
     	res = foxyproxy._selectedProxy && !foxyproxy._selectedProxy.ignoreBlackList ? "no.ignore.blacklists": "mode.dedicated";     	
     	propFcn = function() {foxyproxy.warning.modeDedicated=true;};    
     	break;
  }
  var result = promptWithCB(res);
  result.cb && propFcn();
	if (result.okClicked) {
		prevMode = mode;
	  foxyproxy.setMode(mode, true);
    _updateView();
	}
	else menu.value = prevMode;
}

function onDeleteProxySettings() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("delete.proxy.default"));
  else if (overlay.ask(this, foxyproxy.getMessage("delete.proxy.confirm"))) {
	  // Store cur selection
	  var sel = proxySettingsTree.currentIndex;  
    foxyproxy.proxies.remove(proxySettingsTree.currentIndex);
    _updateView(true);
	  // Reselect what was previously selected
		proxySettingsTree.view.selection.select(sel+1>proxySettingsTree.view.rowCount ? 0:sel);    
  }  
}

function onCopyProxySettings() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("copy.proxy.default"));
  else {  
	  // Store cur selection
	  var sel = proxySettingsTree.currentIndex;    
	  var dom = foxyproxy.proxies.item(proxySettingsTree.currentIndex).toDOM(document);
	  var p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject;
	  p.fromDOM(dom);
	  p.id = foxyproxy.proxies.uniqueRandom(); // give it its own id
	  foxyproxy.proxies.push(p);
	  _updateView(true);
	  // Reselect what was previously selected
		proxySettingsTree.view.selection.select(sel);    	  
	}
}

function onMoveProxySettings(direction) {
  // Store cur selection
  var sel = proxySettingsTree.currentIndex;
  foxyproxy.proxies.move(proxySettingsTree.currentIndex, direction) && _updateView(true);  
  // Reselect what was previously selected
	proxySettingsTree.view.selection.select(sel + (direction=="up"?-1:1));
}

function onProxySettings(isNew) {
  var sel = proxySettingsTree.currentIndex;
    params = {inn:{proxy:isNew ?
      CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject : 
      foxyproxy.proxies.item(proxySettingsTree.currentIndex)}, out:null};
        
  window.openDialog("chrome://foxyproxy/chrome/addeditproxy.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    isNew && foxyproxy.proxies.push(params.out.proxy);
    _updateView(true);
    foxyproxy.writeSettings();
	  // Reselect what was previously selected or the new item
		proxySettingsTree.view.selection.select(isNew?proxySettingsTree.view.rowCount-2:sel);    
  }
}

function setButtons() {
  document.getElementById("tree-row-selected").setAttribute("disabled", proxySettingsTree.currentIndex == -1);
  document.getElementById("moveProxySettingsUpCmd").setAttribute("disabled", 
  	proxySettingsTree.currentIndex == -1 || proxySettingsTree.currentIndex == 0 || _isDefaultProxySelected());
  document.getElementById("moveProxySettingsDownCmd").setAttribute("disabled", 
  	proxySettingsTree.currentIndex == -1 || proxySettingsTree.currentIndex == foxyproxy.proxies.length-1 ||
  	(proxySettingsTree.currentIndex+1 < foxyproxy.proxies.length && foxyproxy.proxies.item(proxySettingsTree.currentIndex+1).lastresort));
}

function onMaxSize() {
	var v = document.getElementById("maxSize").value;
	var passed = true;
	if (/\D/.test(v)) {
		foxyproxy.alert(this, foxyproxy.getMessage("torwiz.nan"));
		passed = false;
	}
	v > 9999 &&
		!overlay.ask(this, foxyproxy.getMessage("logg.maxsize.maximum")) &&
		(passed = false);
	if (!passed) {
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
		return;
	}
	if (overlay.ask(this, foxyproxy.getMessage("logg.maxsize.change"))) {
		foxyproxy.logg.maxSize = v;
		_updateView(false, true);
	}
	else
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
}
/*
function onIncludeDirectInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDirect = this.checked;
}

function onIncludeDisabledInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDisabled = this.checked;
}*/
function updateTemplateExample(controlName, exampleControlName, saObj) {
  controlName && (document.getElementById(controlName).value = saObj.urlTemplate);    
	document.getElementById(exampleControlName+"2").value = saObj.applyTemplate(document.getElementById(exampleControlName+"1").value);
}

function onAutoAddProxyChanged(proxyId) {
	foxyproxy.autoadd.proxy = foxyproxy.proxies.getProxyById(proxyId);
}

function onAutoAddEnabled(cb) {
	if (cb.checked) {
		if (foxyproxy.autoadd.allowed()) {
	  	foxyproxy.autoadd.enabled = true;
		 	document.getElementById("autoAddBroadcaster").hidden = false;	  	
			common.updateSuperAddProxyMenu(foxyproxy.autoadd, document.getElementById("autoAddProxyMenu"), onAutoAddProxyChanged);
		  overlay.alert(this, foxyproxy.getMessage("autoadd.notice"));
		}
		else {
		  overlay.alert(this, foxyproxy.getMessage("superadd.verboten2", [foxyproxy.getMessage("foxyproxy.tab.autoadd.label")]));
		  cb.checked = false;
		}
	}
	else {
	 	document.getElementById("autoAddBroadcaster").hidden = true;
  	foxyproxy.autoadd.enabled = false;
  }
}

function onQuickAddEnabled(cb) {
	if (cb.checked) {
		if (foxyproxy.quickadd.allowed()) {
	  	foxyproxy.quickadd.enabled = true;
		 	document.getElementById("quickAddBroadcaster").hidden = false;	  	
			common.updateSuperAddProxyMenu(foxyproxy.quickadd, document.getElementById("quickAddProxyMenu"), common.onQuickAddProxyChanged);
		  //overlay.alert(this, foxyproxy.getMessage("autoadd.notice"));
		}
		else {
		  overlay.alert(this, foxyproxy.getMessage("superadd.verboten2", [foxyproxy.getMessage("foxyproxy.quickadd.label")]));
		  cb.checked = false;
		}
	}
	else {
	 	document.getElementById("quickAddBroadcaster").hidden = true;
  	foxyproxy.quickadd.enabled = false;
  }
}

function saveLog() {
	const nsIFilePicker = CI.nsIFilePicker;
	var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(this, foxyproxy.getMessage("log.save"), nsIFilePicker.modeSave);
	fp.defaultExtension = "html";
	fp.appendFilters(nsIFilePicker.filterHTML | nsIFilePicker.filterAll);
	if (fp.show() == nsIFilePicker.returnCancel)
 		return;
	
	var os = CC["@mozilla.org/intl/converter-output-stream;1"].createInstance(CI.nsIConverterOutputStream);	
	var fos = CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream); // create the output stream
	fos.init(fp.file, 0x02 | 0x08 | 0x20 /*write | create | truncate*/, 0664, 0);
	os.init(fos, "UTF-8", 0, 0x0000);
	os.writeString(foxyproxy.logg.toHTML());
	os.close();
	if (overlay.ask(this, foxyproxy.getMessage("log.saved2", [fp.file.path]))) {
		var win = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		win.gBrowser.selectedTab = win.gBrowser.addTab(fp.file.path);
  }
}

function exportSettings() {
}

function onProxySettingsTreeSelected() {	
	setButtons();
}

function onProxySettingsTreeMenuPopupShowing() {
	var e = document.getElementById("proxySettingsTreeMenuEnabledPopUpMenuItem"), f = document.getElementById("proxySettingsTreeMenuSeparator");
  e.hidden = f.hidden = _isDefaultProxySelected();
	e.setAttribute("checked", foxyproxy.proxies.item(proxySettingsTree.currentIndex).enabled); 
}

function toggleEnabled() {
	var p = foxyproxy.proxies.item(proxySettingsTree.currentIndex);
	p.enabled = !p.enabled;
	_updateView(true, false);
}

function _isDefaultProxySelected() {
	return foxyproxy.proxies.item(proxySettingsTree.currentIndex).lastresort;
}

function onOK() {
  var r1 = document.getElementById("autoAddRegEx").selected,
    p1 = overlay.common.validatePattern(window, r1, document.getElementById("autoAddTemplateExample2").value, foxyproxy.getMessage("foxyproxy.tab.autoadd.label")),
    r2 = document.getElementById("quickAddRegEx").selected,
    p2 = overlay.common.validatePattern(window, r2, document.getElementById("quickAddTemplateExample2").value, foxyproxy.getMessage("foxyproxy.quickadd.label"));
  p1 && p2 && window.close();
}

function onIgnoreBlackList(checked) {
  if (foxyproxy._selectedProxy && !foxyproxy._selectedProxy.lastresort) {
		if (checked && !foxyproxy.warnings.ignoreBlackList) {
			var result = promptWithCB("no.ignore.blacklists");
			result.value && (foxyproxy.warnings.ignoreBlackList = result.value);
			if (!result.okClicked) {
			  document.getElementById("ignoreBlackListEnabled").checked = false;
				return;
		  }	  
		}
    foxyproxy._selectedProxy.ignoreBlackList = checked;  
    foxyproxy.writeSettings();    
  }
}

function promptWithCB(msg) {
	var cb = {};
	var ret = (CC["@mozilla.org/embedcomp/prompt-service;1"].getService(CI.nsIPromptService)
	  .confirmCheck(window, foxyproxy.getMessage("foxyproxy"), foxyproxy.getMessage(msg), foxyproxy.getMessage("message.stop"), cb));
	return {cb:cb.value, okClicked:ret};
}