var overlay;

function onLoad() {
  // window.arguments is null if user opened about.xul from EM's Options button
  overlay = window.arguments && window.arguments[0].inn.overlay;
  if (!overlay)
    overlay = foxyproxy_common.getMostRecentWindow();
  document.getElementById("ver").value += " " + foxyproxy_common.getVersion();
	sizeToContent();      
}
