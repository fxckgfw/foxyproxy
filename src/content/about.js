/**
  FoxyProxy
  Copyright (C) 2006, 2007 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
All Rights Reserved. U.S. PATENT PENDING.
**/

var overlay;

function onLoad() {
  // window.arguments is null if user opened about.xul from EM's Options button
  overlay = window.arguments && window.arguments[0].inn.overlay;
  !overlay &&
    (overlay = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy);

  var rdfs = Components.classes["@mozilla.org/rdf/rdf-service;1"]
            .getService(Components.interfaces.nsIRDFService);
  var ds = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager).datasource;
  var valueLiteral = ds.GetTarget(rdfs.GetResource("urn:mozilla:item:foxyproxy@eric.h.jung"), rdfs.GetResource("http://www.mozilla.org/2004/em-rdf#version"), true);
  var v = valueLiteral.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
  var ver = document.getElementById("ver");
  ver.value += " " + v;    
	sizeToContent();      
}