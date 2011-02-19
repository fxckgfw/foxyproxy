/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and LeahScape, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

"use strict";

var Cc = Components.classes, Cu = Components.utils;
var fpc = Cc["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
var fp = Cc["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;

Cu.import("resource://foxyproxy/patternSubscriptions.jsm");

function onLoad() {
  try {
    var metadata;
    var proxyTree = document.getElementById("subscriptionProxyTree");
    var formatList = document.getElementById("subscriptionFormat");
    var obfuscationList = document.getElementById("subscriptionObfuscation");
    if (window.arguments[0].inn !== null) {
      metadata = window.arguments[0].inn.metadata;
      document.getElementById("subscriptionName").value = metadata.name;
      document.getElementById("subscriptionNotes").value = metadata.notes;
      document.getElementById("subscriptionUrl").value = metadata.url;
      if (metadata.proxies) {
        proxyTree.view = fpc.makeProxyTreeView(metadata.proxies, document);
      }
      document.getElementById("refresh").value = metadata.refresh;
      // Assuming we have only 'FoxyProxy' and 'AutoProxy' as format values...
      if (metadata.format === "FoxyProxy") {
        formatList.selectedIndex = 0;
      } else {
        formatList.selectedIndex = 1;
      } 
      // And assuming that we only have 'None' and 'Base64' so far as 
      // obfusctaion methods...
      if (metadata.obfuscation === "Base64") {
        obfuscationList.selectedIndex = 1;
      } else {
        obfuscationList.selectedIndex = 0;
      }
    } 
  } catch(e) {
    dump("There went something wrong within the onLoad function: " + e + "\n");
  }
}

function onOK() {
  try {
    var userValues = {};
    var parsedSubscription;
    var url = document.getElementById("subscriptionUrl").value;
    // ToDo: Do we want to check whether it is really a URL here?
    if (url === null || url === "") {
      fp.alert(this, fp.getMessage("patternsubscription.invalid.url")); 
      return false;
    }
    userValues.enabled = document.getElementById("subscriptionEnabled").checked;
    userValues.name = document.getElementById("subscriptionName").value;  
    userValues.notes = document.getElementById("subscriptionNotes").value; 
    userValues.url = url;
    userValues.proxies = [];
    userValues.refresh = document.getElementById("refresh").value;
    userValues.format = document.getElementById("subscriptionFormat").
      selectedItem.label;
    userValues.obfuscation = document.getElementById("subscriptionObfuscation").
      selectedItem.label;
    if (window.arguments[0].inn === null) {
      parsedSubscription = patternSubscriptions.
	loadSubscription(userValues.url);
      if (parsedSubscription) {
        window.arguments[0].out = {
          subscription : parsedSubscription,
          userValues : userValues
        };
	return true;
      }
    } else {
      window.arguments[0].out = {
        userValues : userValues
      }
      return true;
    }
    return false;
  } catch(e) {
    dump("There went something wrong in the onOK function: " + e + "\n");
  }
}

function onLastStatus() {
  window.openDialog('chrome://foxyproxy/content/pattern-subscriptions/laststatus.xul', '', 'modal, centerscreen, resizable').focus();
}

function addProxy() {
  var fp = Cc["@leahscape.org/foxyproxy/service;1"].getService().
             wrappedJSObject; 
  var p = {
    inn: {
      title: fp.getMessage("choose.proxy.patterns"), 
      pattern: true
    }, 
    out: null
  };          
  window.openDialog("chrome://foxyproxy/content/chooseproxy.xul", "",
        "modal, centerscreen, resizable", p).focus(); 
  if (p.out) {
    p = p.out;
  }
}

function contextHelp(type) {
  switch (type) {
    case "format":
      fpc.openAndReuseOneTabPerURL('http://getfoxyproxy.org/patternsubscriptions/index.html#format'); 
      break;
    case "obfuscation":
      fpc.openAndReuseOneTabPerURL('http://getfoxyproxy.org/patternsubscriptions/index.html#obfuscation'); 
      break;
    case "refresh":
      fpc.openAndReuseOneTabPerURL('http://getfoxyproxy.org/patternsubscriptions/index.html#refresh-rate'); 
      break;
    default:
      break;
  }
}
