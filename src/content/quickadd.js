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
var fp, overlay, common;
const CI = Components.interfaces, CC = Components.classes;

function onOK() {	  
  var r = document.getElementById("regex").selected;
  var p = overlay.common.validatePattern(window, r, document.getElementById("quickAddTemplateExample2").value);
  if (p) {
	  cleanup();
		window.arguments[0].out	= {reload:document.getElementById("quickAddReload").checked,
			notify:document.getElementById("quickAddNotify").checked, prompt:document.getElementById("quickAddPrompt").checked,
			proxy:document.getElementById("quickAddProxyMenu").value,
			notifyWhenCanceled:document.getElementById("quickAddNotifyWhenCanceled").checked,
			urlTemplate:p,
			matchType:document.getElementById("quickAddMatchType").value};	
    return true;
	}
  return false;
}

function onCancel() {
	cleanup();
	return true;
}

function cleanup() {
	var obSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
	obSvc.removeObserver(window, "foxyproxy-mode-change");
	obSvc.removeObserver(window, "foxyproxy-updateviews");	
}

function observe(subj, topic, str) {
	switch (topic) {
		case "foxyproxy-mode-change":
			dump("mode change: " + str + "\n");
			str == "disabled" && window.close();
			// TODO: does this call onOK() or onCancel()?
			break;
		case "foxyproxy-updateviews":
			this.updateViews(false, false);
			break;							
	}
}

/* Contains items which can be updated via toolbar/statusbar/menubar/context-menu as well as the options dialog,
	so we don't include these in onLoad() */
function updateView() {
  document.getElementById("quickAddUrlTemplate").value = fp.quickadd.urlTemplate;  
  document.getElementById("quickAddMatchType").value = fp.quickadd.match.isRegEx ? "r" : "w"; 
  document.getElementById("quickAddReload").checked = fp.quickadd.reload;
  document.getElementById("quickAddNotify").checked = fp.quickadd.notify; 
  document.getElementById("quickAddNotifyWhenCanceled").checked = fp.quickadd.notifyWhenCanceled;   
  document.getElementById("quickAddPrompt").checked = fp.quickadd.prompt;   
  common.updateSuperAddProxyMenu(fp.quickadd, document.getElementById("quickAddProxyMenu"), common.onQuickAddProxyChanged);
}

function onLoad() {
  overlay = CC["@mozilla.org/appshell/window-mediator;1"]
    .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy;
	common=overlay.common;     
	fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject;	
	
	var obSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
	obSvc.addObserver(window, "foxyproxy-mode-change", false);
	obSvc.addObserver(window, "foxyproxy-updateviews", false);
	
  var w = CC["@mozilla.org/appshell/window-mediator;1"]
      .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser");  
	document.getElementById("quickAddTemplateExample1").value = w ? w.content.document.location.href : "";
  updateTemplateExample("quickAddUrlTemplate", "quickAddTemplateExample", fp.quickadd);  
  updateView();  
  sizeToContent();  
}

function updateTemplateExample(controlName, exampleControlName, saObj) {
  controlName && (document.getElementById(controlName).value = saObj.urlTemplate);    
	document.getElementById(exampleControlName+"2").value = saObj.applyTemplate(document.getElementById(exampleControlName+"1").value);
}
