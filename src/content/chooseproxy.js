var proxyTree, fp, fpc, overlay, inn;
const CC = Components.classes, CI = Components.interfaces;

function onLoad() {
  proxyTree = document.getElementById("proxyTree");
  fp = CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;  
  fpc = CC["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  overlay = fpc.getMostRecentWindow().foxyproxy;
  inn = window.arguments[0].inn;
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

function onSettings() {
  var p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance().wrappedJSObject;
  p.name = inn.host;
  p.manualconf.host = inn.host;
  p.manualconf.port = inn.port;
  var params = {inn:{proxy: p}, out:null};
        
  window.openDialog("chrome://foxyproxy/content/addeditproxy.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    fp.proxies.push(params.out.proxy);
    proxyTree.view = fpc.makeProxyTreeView(fp); /* reset the view to show the new entry */
    fp.writeSettings();  
  }

  // Reselect what was previously selected or the new item
  proxyTree.view.selection.select(proxyTree.view.rowCount-2);
  document.documentElement.acceptDialog();
}