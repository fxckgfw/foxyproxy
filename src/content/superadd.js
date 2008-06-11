var fp, fpc, inn, match;
function onLoad() {
  inn = window.arguments[0].inn;
  match = inn.match;
  fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("reload").checked = inn.reload;
  document.getElementById("prompt").checked = inn.prompt;
  document.getElementById("notify").checked = inn.notify;
  document.getElementById("notifyWhenCanceled").checked = inn.notifyWhenCanceled;
  document.getElementById("url").value = inn.url;
  updateGeneratedPattern();
  var proxyMenu = document.getElementById("proxyMenu");
  inn.superadd.updateProxyMenu(proxyMenu, document);
  if (inn.superadd == fp.autoadd) {
    // Change QuickAdd references to AutoAdd
    window.document.title = fp.getMessage("foxyproxy.tab.autoadd.label");
    // Show AutoAdd specifics
    var e = document.getElementById("notify");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.tooltip2"));
    document.getElementById("autoAddBroadcaster").setAttribute("hidden", true);
  }   
  sizeToContent();  
}

function onOK() {
  var pat = document.getElementById("generatedPattern").value;
  var p = fpc.validatePattern(window, match.isRegEx, pat);
  if (p) {
    window.arguments[0].out = {
      reload:document.getElementById("reload").checked,
      notify:document.getElementById("notify").checked,
      prompt:document.getElementById("prompt").checked,
      notifyWhenCanceled:document.getElementById("notifyWhenCanceled").checked,
      proxyId:document.getElementById("proxyMenu").value, 
      match:match}; 
    return true;
  }
}

function updateGeneratedPattern() {
	document.getElementById("generatedPattern").value =
    fpc.applyTemplate(document.getElementById("url").value, match.pattern, match.caseSensitive);
}

function onPattern() {
  var params = {inn:{match:match, superadd:true}, out:null};

  window.openDialog("chrome://foxyproxy/content/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out) {
    match = params.out.match;
    updateGeneratedPattern();
  }
}
