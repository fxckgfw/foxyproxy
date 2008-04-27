var fpc;

function onLoad() {
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("ver").value += " " + fpc.getVersion();
	sizeToContent();      
}
