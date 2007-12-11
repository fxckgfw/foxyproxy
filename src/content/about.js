var overlay;

function onLoad() {
  // window.arguments is null if user opened about.xul from EM's Options button
  overlay = window.arguments && window.arguments[0].inn.overlay;
  !overlay &&
    (overlay = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy);

  var em = Components.classes["@mozilla.org/extensions/manager;1"]
            .getService(Components.interfaces.nsIExtensionManager);
  var ver = document.getElementById("ver");
  ver.value += " " + (em.getItemForID("foxyproxy@eric.h.jung").version || "?"); 
	sizeToContent();      
}
