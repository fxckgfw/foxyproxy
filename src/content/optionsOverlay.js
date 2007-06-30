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
// begin FF 1.5.x stuff
function onConnectionSettings() {

  var fp = Components.classes["@leahscape.org/foxyproxy/service;1"]
    .getService(Components.interfaces.nsISupports).wrappedJSObject;
  
  if (fp.mode == "disabled")
	  document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);
	else {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	          .getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow("navigator:browser");
		if (win && win.foxyproxy)
		  win.foxyproxy.onOptionsDialog();
		else {
		  alert("FoxyProxy Error");
			document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);		  
		}
	}
}
window.onload=function(){
  var e = document.getElementById("catProxiesButton");
  e && e.setAttribute("oncommand", "onConnectionSettings();");
  try {
    gAdvancedPane && (gAdvancedPane.showConnections = onConnectionSettings);  
  }
  catch (e) {/*wtf*/}
}
// end FF 1.5.x stuff

// FF 2.0.x stuff
