"use strict";

var Cc = Components.classes;

function onLoad() {
   
}

function onOK() {

}

function onCancel() {

}

function onLastStatus() {
  window.openDialog('chrome://foxyproxy/content/laststatus.xul', '', 
      'modal, centerscreen, resizable').focus();
}

function addProxy() {
  var Cc = Components.classes;
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
  var fpc = Cc["@leahscape.org/foxyproxy/common;1"].getService().
            wrappedJSObject;  
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
