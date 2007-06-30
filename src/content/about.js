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
