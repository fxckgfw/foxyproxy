var fp, fpc, inn;
function onLoad() {
  inn = window.arguments[0].inn;  
  fp = Components.classes["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
  fpc = Components.classes["@leahscape.org/foxyproxy/common;1"].getService().wrappedJSObject;
  document.getElementById("enabled").checked = inn.enabled;
  document.getElementById("reload").checked = inn.reload;
  document.getElementById("prompt").checked = inn.prompt;
  document.getElementById("notify").checked = inn.notify;
  document.getElementById("notifyWhenCanceled").checked = inn.notifyWhenCanceled;
  var proxyMenuPopup = document.getElementById("proxyMenuPopup");
  for (var i=0,p; i<inn.proxies.length && ((p=inn.proxies.item(i)) || 1); i++) {
    if (!p.lastresort && p.enabled) {
      proxyMenuPopup.appendChild(fpc.createMenuItem({idVal:p.id, labelVal:p.name, document:document}));
    }
  }
  document.getElementById("proxyMenu").value = inn.proxyId || proxyMenuPopup.firstChild.id;
  document.getElementById("url").value = inn.url;
  updateGeneratedPattern();
  document.getElementById("setupMode").setAttribute("hidden", inn.setupMode);
  document.getElementById("notSetupMode").setAttribute("hidden", !inn.setupMode);
  if (inn.isQuickAdd) {
    document.getElementById("autoAddMode").setAttribute("hidden", true);
  } 
  else {
    // Hide QuickAdd specifics from AutoAdd
    window.document.title = fp.getMessage("foxyproxy.tab.autoadd.label");
    document.getElementById("quickAddMode").setAttribute("hidden", true);
    // Show AutoAdd specifics
    var e = document.getElementById("notify");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.tooltip2"));
    e = document.getElementById("notifyWhenCanceled");
    e.label = fp.getMessage("foxyproxy.autoadd.notify.whencanceled.label");
    e.setAttribute("tooltiptext", fp.getMessage("foxyproxy.autoadd.notify.whencanceled.tooltip")); 
    e = document.getElementById("notifyWhenCanceledPopup");
    document.getElementById("autoAddPattern").value = inn.autoAddPattern;
    document.getElementById("autoAddCaseSensitive").checked = inn.autoAddCaseSensitive;
  }   
  sizeToContent();  
}

function onOK() {   
  var isRegEx = document.getElementById("matchtype").value=="r";
  var p = window.arguments[0].inn.setupMode || fpc.validatePattern(window, isRegEx, document.getElementById("generatedPattern").value);
  if (p) {
    window.arguments[0].out = {enabled:document.getElementById("enabled").checked,
      temp:document.getElementById("temp").checked,
      reload:document.getElementById("reload").checked,
      notify:document.getElementById("notify").checked,
      prompt:document.getElementById("prompt").checked,
      notifyWhenCanceled:document.getElementById("notifyWhenCanceled").checked,
      proxyId:document.getElementById("proxyMenu").value,     
      name:document.getElementById("name").value,       
      urlTemplate:document.getElementById("urlTemplate").value,
      pattern:document.getElementById("generatedPattern").value,
      caseSensitive:document.getElementById("caseSensitive").checked,      
      isRegEx:isRegEx,
      isBlackList:document.getElementById("whiteblacktype").value == "b",
      autoAddPattern:document.getElementById("autoAddPattern").value,
      autoAddCaseSensitive:document.getElementById("autoAddCaseSensitive").checked}; 
    return true;
  }
}

function updateGeneratedPattern() {
	//document.getElementById("generatedPattern").value =
    //fpc.applyTemplate(document.getElementById("url").value,
      //document.getElementById("urlTemplate").value,
      //document.getElementById("caseSensitive").checked);
}

function onPattern() {
  var params = {inn:{name:inn.match.name,
          pattern:inn.match.pattern, regex:inn.match.isRegEx,
          black:inn.match.isBlackList,
          enabled:inn.match.enabled,
          caseSensitive:inn.match.caseSensitive,
          temp:inn.match.temp}, out:null};

  window.openDialog("chrome://foxyproxy/content/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();

  if (params.out) {
    params = params.out;    
    inn.match.name = params.name;
    inn.match.pattern = params.pattern;
    inn.match.isRegEx = params.isRegEx;
    inn.match.isBlackList = params.isBlackList;
    inn.match.enabled = params.isEnabled;
    inn.match.caseSensitive = params.caseSensitive;
    inn.match.temp = params.temp;
  }
}