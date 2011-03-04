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
var proxyTree;
var fpc = Cc["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
var fp = Cc["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
// We need this proxy wrapper at least in order to use the makeProxyTreeView
// method in common.js
var proxies = {
  list : [],
  push : function(p) {
    this.list.push(p);
  },
  get length() {
    return this.list.length;
  },
  item : function(i) {
    return this.list[i];
  }
}

Cu.import("resource://foxyproxy/patternSubscriptions.jsm");

function onLoad() {
  try {
    var metadata;
    var formatList = document.getElementById("subscriptionFormat");
    var obfuscationList = document.getElementById("subscriptionObfuscation");
    proxyTree = document.getElementById("subscriptionProxyTree"); 
    if (window.arguments[0].inn !== null) {
      metadata = window.arguments[0].inn.subscription.metadata;
      document.getElementById("subscriptionEnabled").checked = metadata.enabled;
      document.getElementById("subscriptionName").value = metadata.name;
      document.getElementById("subscriptionNotes").value = metadata.notes;
      document.getElementById("subscriptionUrl").value = metadata.url;
      // The following piece of code deals with the problem of correlating
      // proxies to subscriptions. The single proxies are not parsable using
      // JSON but our whole pattern subscription feature depends on that.
      // Thus, in order to get the proxies related to a subscription their
      // id's are saved into an array that is parsable using JSON (see: onOk())
      // and if the addeditsubscription dialog is loaded the proxies object
      // is constructed using those saved id's. That accomplish the following
      // five lines of code.
      if (metadata.proxies.length > 0) {
	for (var i = 0; i < metadata.proxies.length; i++) {
	  for (var j = 0; j < fp.proxies.length; j++) { 
	    if (metadata.proxies[i] === fp.proxies.item(j).id) {
	      proxies.list.push(fp.proxies.item(j));
	    }
	  }
	}
        proxyTree.view = fpc.makeProxyTreeView(proxies, document);
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
    } else {
      // As the user is adding a new subscription there is nothing to refresh
      // yet. There is no last status either. Therefore, we disabling these
      // buttons.
      document.getElementById("refreshButton").disabled = true;
      document.documentElement.getButton("extra2").disabled = true;
    }
  } catch(e) {
    dump("There went something wrong within the onLoad function: " + e + "\n");
  }
}

function onOK() {
  try {
    var userValues = {};
    userValues.proxies = [];
    var parsedSubscription, base64Encoded;
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
    for (var i = 0; i < proxies.list.length; i++) {
      userValues.proxies.push(proxies.item(i).id);
    }
    userValues.refresh = document.getElementById("refresh").value;
    userValues.format = document.getElementById("subscriptionFormat").
      selectedItem.label;
    userValues.obfuscation = document.getElementById("subscriptionObfuscation").
      selectedItem.label;
    if (window.arguments[0].inn === null) {
      base64Encoded = userValues.obfuscation.toLowerCase() === "base64";
      parsedSubscription = patternSubscriptions.
	loadSubscription(userValues.url, base64Encoded);
      // The following is kind of a trivial array test. We need that to check
      // whether we got an array of error Messages back or a subscription
      // object. Iff the latter is the case we add a new subscription. As we
      // do not have any subscription yet if we got an array back, we silently
      // ignore it and returning just false. 
      if (parsedSubscription && parsedSubscription.length === undefined) {
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
  var metadata = window.arguments[0].inn.subscription.metadata;
  var statusString = metadata.lastUpdate + "   " + metadata.lastStatus;
  if (!metadata.errorMessages) {
    statusString = statusString + "   " + window.arguments[0].inn.subscription.
      subscription.patterns.length + " " +
      fp.getMessage("patternsubscription.successful.retrieved"); 
  } 
  var p = {
    inn: {
      status: statusString,
      errorMessages: metadata.errorMessages 
    }
  };
  window.openDialog('chrome://foxyproxy/content/pattern-subscriptions/laststatus.xul', '', 'modal, centerscreen, resizable', p).focus();
}

function addProxy(e) {
  if (e.type === "click" && e.button === 0) { 
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
      proxies.push(p.out.proxy);
      document.getElementById("subscriptionProxyTree").view = fpc.
        makeProxyTreeView(proxies, document); 
    }
  }
}

function removeProxy(e) {
  if (e.type === "click" && e.button === 0) { 
    if (proxyTree.currentIndex < 0) {
      fp.alert(this, fp.getMessage("patternsubscription.noproxy.selected")); 
      return;
    }   
    proxies.list.splice(proxyTree.currentIndex, 1); 
    proxyTree.view = fpc.makeProxyTreeView(proxies, document); 
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

function refreshSubscription(e) {
  if (e.type === "click" && e.button === 0) {
    patternSubscriptions.refreshSubscription(window.arguments[0].inn.
      subscription, true);
  }
}
