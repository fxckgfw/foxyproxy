var proxyTree, fp, fpc, overlay;
const CC = Components.classes, CI = Components.interfaces;

function onLoad() {
  proxyTree = document.getElementById("proxyTree");
  fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;  
  fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  overlay = fpc.getMostRecentWindow().foxyproxy;
  var inn = window.arguments[0].inn;
  document.getElementById("title").value = inn.title;
  proxyTree.view = fpc.makeProxyTreeView(fp);
  proxyTree.view.selection.select(0); /* select the first entry */
  document.getElementById("reloadcurtab").checked = inn.reloadcurtab;
  sizeToContent();
}

function onOK() {
  if (proxyTree.currentIndex != -1)
    window.arguments[0].out = {proxy:fp.proxies.item(proxyTree.currentIndex), reloadcurtab:
      document.getElementById("reloadcurtab").checked};
  return true;
}