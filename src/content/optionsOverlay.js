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
