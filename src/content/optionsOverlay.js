window.onload=function(){
  // works with ff 1.5, 2.x, and 3.x
  var e = document.getElementById("catProxiesButton") || document.getElementById("connectionSettings");
  if (e) e.setAttribute("oncommand", "onConnectionSettings();");
  else {
	  try {
	    gAdvancedPane && (gAdvancedPane.showConnections = onConnectionSettings);
	  }
	  catch (e) {/*wtf*/}
	}
}
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
