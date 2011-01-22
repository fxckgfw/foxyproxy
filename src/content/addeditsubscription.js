"use strict";

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
