/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/
window.onload=function(){
  // works with ff 1.5, 2.x, and 3.x
  var e = document.getElementById("catProxiesButton") || document.getElementById("connectionSettings");
  if (e) e.setAttribute("oncommand", "onConnectionSettings();");
  else {
	  try {
	    gAdvancedPane && (gAdvancedPane.showConnections = onConnectionSettings);
	  }
	  catch (e) {dump(e);/*wtf*/}
	}
}
function onConnectionSettings() {
  var fp = Components.classes["@leahscape.org/foxyproxy/service;1"]
    .getService(Components.interfaces.nsISupports).wrappedJSObject;
  
  if (fp.mode == "disabled")
	  document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);
	else {
		var win = foxyproxy_common.getMostRecentWindow();
		if (win && win.foxyproxy)
		  win.foxyproxy.onOptionsDialog();
		else {
		  alert("FoxyProxy Error");
		  document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);		  
		}
	}
}
