var fp, fpc, inn, match;
function onLoad() {
  inn = window.arguments[0].inn;
  match = inn.match.clone();
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
    e = document.getElementById("notifyWhenCanceled");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.whencanceled.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.whencanceled.tooltip")); 
    document.getElementById("qaDesc").setAttribute("hidden", true);
    document.getElementById("aaDesc").setAttribute("hidden", false);
  }   
  sizeToContent();  
}

function onOK() {   
  var isRegEx = document.getElementById("matchtype").value=="r";
  var p = fpc.validatePattern(window, isRegEx, document.getElementById("generatedPattern").value);
  if (p) {
    window.arguments[0].out = {
      reload:document.getElementById("reload").checked,
      notify:document.getElementById("notify").checked,
      prompt:document.getElementById("prompt").checked,
      notifyWhenCanceled:document.getElementById("notifyWhenCanceled").checked,
      proxyId:document.getElementById("proxyMenu").value, 
      pattern:document.getElementById("generatedPattern").value,
      match:match}; 
    return true;
  }
}

function updateGeneratedPattern() {
	document.getElementById("generatedPattern").value =
    fpc.applyTemplate(document.getElementById("url").value,
      document.getElementById("urlTemplate").value,
      document.getElementById("caseSensitive").checked);
}

function onPattern() {
  var params = {inn:{match:match, superadd:true}, out:null};

  window.openDialog("chrome://foxyproxy/content/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out)
    match = params.out.match;
}
