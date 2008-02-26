var fp, overlay, common;
const CI = Components.interfaces, CC = Components.classes;

var observer = {
	observe:function(subj, topic, str) {
		switch (topic) {
			case "foxyproxy-mode-change":
				if (str == "disabled")
				cleanup(); 
				window.close();// this calls neither onOK() or onCancel() so we forcibly call cleanup() first		
				break;
			case "foxyproxy-updateviews":
				updateViews(false, false);
				break;							
		}
	}
};
function onOK() {	  
  var r = document.getElementById("regex").selected;
  var p = foxyproxy_common.validatePattern(window, r, document.getElementById("quickAddTemplateExample2").value);
  if (p) {
	  cleanup();
		window.arguments[0].out	= {reload:document.getElementById("quickAddReload").checked,
			notify:document.getElementById("quickAddNotify").checked, prompt:document.getElementById("quickAddPrompt").checked,
			proxy:document.getElementById("quickAddProxyMenu").value,
			notifyWhenCanceled:document.getElementById("quickAddNotifyWhenCanceled").checked,
			urlTemplate:document.getElementById("quickAddUrlTemplate").value,
			matchType:document.getElementById("quickAddMatchType").value,
            caseSensitive:document.getElementById("quickAddCaseSensitive").checked};	
    return true;
	}
  return false;
}

function onCancel() {
	cleanup();
	return true;
}

function cleanup() {
	var obSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
	obSvc.removeObserver(observer, "foxyproxy-mode-change");
	obSvc.removeObserver(observer, "foxyproxy-updateviews");	
}

/* Contains items which can be updated via toolbar/statusbar/menubar/context-menu as well as the options dialog,
	so we don't include these in onLoad() */
function updateView() {
  document.getElementById("quickAddUrlTemplate").value = fp.quickadd.urlTemplate;  
  document.getElementById("quickAddMatchType").value = fp.quickadd.match.isRegEx ? "r" : "w";
  document.getElementById("quickAddCaseSensitive").checked = fp.quickadd.match.caseSensitive;
  document.getElementById("quickAddReload").checked = fp.quickadd.reload;
  document.getElementById("quickAddNotify").checked = fp.quickadd.notify; 
  document.getElementById("quickAddNotifyWhenCanceled").checked = fp.quickadd.notifyWhenCanceled;   
  document.getElementById("quickAddPrompt").checked = fp.quickadd.prompt;  
  foxyproxy_common.updateSuperAddProxyMenu(fp.quickadd, document.getElementById("quickAddProxyMenu"), foxyproxy_common.onQuickAddProxyChanged, document);
}

function onLoad() {
  var mrw = foxyproxy_common.getMostRecentWindow();
  overlay = mrw.foxyproxy;
  fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject;	

  var obSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
  obSvc.addObserver(observer, "foxyproxy-mode-change", false);
  obSvc.addObserver(observer, "foxyproxy-updateviews", false);
 
  document.getElementById("quickAddTemplateExample1").value = mrw ? mrw.content.document.location.href : "";
  updateTemplateExample("quickAddUrlTemplate", "quickAddTemplateExample", fp.quickadd);  
  updateView();  
  sizeToContent();  
}

function updateTemplateExample(controlName, exampleControlName, saObj) {
  controlName && (document.getElementById(controlName).value = saObj.urlTemplate);    
	document.getElementById(exampleControlName+"2").value = saObj.applyTemplate(document.getElementById(exampleControlName+"1").value);
}
